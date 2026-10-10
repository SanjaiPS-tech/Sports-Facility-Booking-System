/**
 * BookingService
 * Enforces Business Rules BR1-BR10 and Functional Requirements FR2-FR9.
 * Handles atomic reservation creation, fare calculation, snapshotting,
 * operational lifecycle transitions, and stock-restoring cancellations.
 */
const db = require('../config/database');
const crypto = require('crypto');

class BookingService {
    /**
     * BR1 / FR2: Validate quantity constraint.
     * Must be an integer between 1 and 5 inclusive.
     * @param {any} quantity 
     */
    static validateQuantity(quantity) {
        if (quantity === undefined || quantity === null || quantity === '') {
            throw new Error('Quantity is required. Must be an integer from 1 to 5.');
        }

        const num = Number(quantity);
        if (typeof quantity === 'string' && quantity.trim().includes('.')) {
            throw new Error('Invalid quantity: decimals are not permitted. Quantity must be an integer from 1 to 5.');
        }

        if (!Number.isInteger(num)) {
            throw new Error('Invalid quantity: decimals or non-integers are not permitted. Quantity must be an integer from 1 to 5.');
        }

        if (num < 1 || num > 5) {
            throw new Error(`Invalid quantity: ${num}. Must be an integer from 1 to 5 (zero, negatives, and values above 5 are rejected).`);
        }

        return num;
    }

    /**
     * BR4 / FR3: Calculate base amount, booking charge, and total amount.
     * base_amount = rate * quantity
     * booking_charge = Rs.50 if base_amount < Rs.1,000, else Rs.0
     * total_amount = base_amount + booking_charge
     * 
     * @param {number} rate 
     * @param {number} quantity 
     * @returns {Object}
     */
    static calculateFare(rate, quantity) {
        const parsedRate = parseFloat(rate);
        const qty = parseInt(quantity, 10);

        if (isNaN(parsedRate) || parsedRate <= 0) {
            throw new Error('Invalid rate for fare calculation.');
        }
        if (!Number.isInteger(qty) || qty < 1 || qty > 5) {
            throw new Error('Invalid quantity for fare calculation.');
        }

        const baseAmount = Math.round(parsedRate * qty * 100) / 100;
        const bookingCharge = baseAmount < 1000 ? 50.00 : 0.00;
        const totalAmount = Math.round((baseAmount + bookingCharge) * 100) / 100;

        return {
            unit_rate: parsedRate,
            quantity: qty,
            base_amount: baseAmount,
            booking_charge: bookingCharge,
            total_amount: totalAmount
        };
    }

    /**
     * BR5 / FR4: Validate customer details.
     * @param {Object} details 
     */
    static validateCustomerDetails({ customer_name, customer_phone, booking_date, identity_proof }) {
        if (!customer_name || typeof customer_name !== 'string' || customer_name.trim().length === 0) {
            throw new Error('Customer name is required and cannot be blank.');
        }

        if (!customer_phone || typeof customer_phone !== 'string') {
            throw new Error('Customer phone number is required and must contain exactly 10 digits.');
        }

        const phoneClean = customer_phone.trim();
        if (!/^[0-9]{10}$/.test(phoneClean)) {
            throw new Error(`Invalid phone number: '${customer_phone}'. Must contain exactly 10 numeric digits.`);
        }

        if (!booking_date || typeof booking_date !== 'string') {
            throw new Error('Booking date is required in YYYY-MM-DD format.');
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(booking_date.trim())) {
            throw new Error(`Invalid booking date format: '${booking_date}'. Expected format: YYYY-MM-DD.`);
        }

        const parsedDate = new Date(booking_date.trim() + 'T00:00:00Z');
        if (isNaN(parsedDate.getTime())) {
            throw new Error(`Invalid calendar date: '${booking_date}'.`);
        }

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        if (parsedDate < today) {
            throw new Error(`Booking date cannot be in the past: '${booking_date}'. Must be today or a future date.`);
        }

        if (!identity_proof || typeof identity_proof !== 'string' || identity_proof.trim().length === 0) {
            throw new Error('Identity / reference field is required and cannot be blank.');
        }

        return {
            customer_name: customer_name.trim(),
            customer_phone: phoneClean,
            booking_date: booking_date.trim(),
            identity_proof: identity_proof.trim()
        };
    }

    /**
     * Generate a unique booking reference.
     */
    static generateBookingReference() {
        const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
        return `BK-${datePart}-${randomHex}`;
    }

    /**
     * BR2, BR3, BR6, BR7 / FR5: Atomically create a confirmed reservation.
     * - Locks facility row FOR UPDATE.
     * - Revalidates active status and sufficient availability.
     * - Snapshots the current rate and customer details immutably.
     * - Decrements availability atomically.
     * - Inserts reservation, reservation item, and initial status history.
     * - Rejection leaves no partial database changes (BR6).
     * 
     * @param {Object} data 
     * @param {Object} requestingUser
     * @returns {Promise<Object>}
     */
    static async createReservation(data, requestingUser) {
        if (!requestingUser || !requestingUser.id) {
            throw new Error('Authenticated user context is required to create a reservation.');
        }

        // 1. Validate quantity (BR1)
        const quantity = this.validateQuantity(data.quantity);

        // 2. Validate customer details (BR5)
        const validatedDetails = this.validateCustomerDetails({
            customer_name: data.customer_name,
            customer_phone: data.customer_phone,
            booking_date: data.booking_date,
            identity_proof: data.identity_proof
        });

        // 3. Resource code / id lookup
        const resourceIdentifier = data.resource_id || data.resource_code;
        if (!resourceIdentifier) {
            throw new Error('Sports facility identifier (resource_id or resource_code) is required.');
        }

        // 4. Atomic Execution inside MySQL Transaction
        return await db.withTransaction(async (conn) => {
            // Find and lock resource row
            const [resources] = await conn.query(
                `SELECT id, resource_code, name, category, hourly_rate, available_quantity, is_active
                 FROM resources
                 WHERE ${typeof resourceIdentifier === 'number' || !isNaN(Number(resourceIdentifier)) ? 'id = ?' : 'resource_code = ?'}
                 FOR UPDATE;`,
                [resourceIdentifier]
            );

            if (resources.length === 0) {
                throw new Error(`Sports facility not found for identifier: ${resourceIdentifier}.`);
            }

            const facility = resources[0];

            // BR2: Allow booking only for active facilities with sufficient availability
            if (!facility.is_active) {
                throw new Error(`Facility ${facility.resource_code} (${facility.name}) is currently inactive and cannot be booked.`);
            }

            const currentAvailability = parseInt(facility.available_quantity, 10);
            if (currentAvailability < quantity) {
                throw new Error(
                    `Insufficient availability for ${facility.resource_code} (${facility.name}). ` +
                    `Requested: ${quantity}, Available: ${currentAvailability}. Booking rejected.`
                );
            }

            // BR3 / FR5: Use current rate at confirmation and save immutable fare snapshot
            const fare = this.calculateFare(facility.hourly_rate, quantity);
            const bookingReference = this.generateBookingReference();

            // BR7: Decrement availability atomically
            const newAvailability = currentAvailability - quantity;
            await conn.query(
                `UPDATE resources SET available_quantity = ? WHERE id = ?;`,
                [newAvailability, facility.id]
            );

            // BR7 / FR5: Insert reservation record
            const [resResult] = await conn.query(
                `INSERT INTO reservations (
                    booking_reference, user_id, booking_date, status,
                    rate_snapshot, quantity_snapshot, base_amount_snapshot,
                    booking_charge_snapshot, total_amount_snapshot,
                    customer_name, customer_phone, identity_proof
                ) VALUES (?, ?, ?, 'CONFIRMED', ?, ?, ?, ?, ?, ?, ?, ?);`,
                [
                    bookingReference,
                    requestingUser.id,
                    validatedDetails.booking_date,
                    fare.unit_rate,
                    fare.quantity,
                    fare.base_amount,
                    fare.booking_charge,
                    fare.total_amount,
                    validatedDetails.customer_name,
                    validatedDetails.customer_phone,
                    validatedDetails.identity_proof
                ]
            );

            const reservationId = resResult.insertId;

            // Insert line item snapshot
            await conn.query(
                `INSERT INTO reservation_items (
                    reservation_id, resource_id, resource_code_snapshot,
                    resource_name_snapshot, unit_rate_snapshot, quantity, subtotal
                ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
                [
                    reservationId,
                    facility.id,
                    facility.resource_code,
                    facility.name,
                    fare.unit_rate,
                    fare.quantity,
                    fare.base_amount
                ]
            );

            // Insert initial status history
            await conn.query(
                `INSERT INTO booking_status_history (
                    reservation_id, from_status, to_status, changed_by_user_id, remarks
                ) VALUES (?, NULL, 'CONFIRMED', ?, 'Initial reservation confirmed with atomic stock deduction.');`,
                [reservationId, requestingUser.id]
            );

            return {
                id: reservationId,
                booking_reference: bookingReference,
                status: 'CONFIRMED',
                user_id: requestingUser.id,
                resource: {
                    id: facility.id,
                    resource_code: facility.resource_code,
                    name: facility.name,
                    remaining_availability: newAvailability
                },
                booking_date: validatedDetails.booking_date,
                fare_snapshot: fare,
                customer: validatedDetails
            };
        });
    }

    /**
     * Retrieve bookings with role & ownership checks (BR10 / FR6).
     * @param {Object} requestingUser 
     * @param {Object} filters
     * @returns {Promise<Array>}
     */
    static async getBookings(requestingUser, filters = {}) {
        if (!requestingUser || !requestingUser.id) {
            throw new Error('Authentication required to view bookings.');
        }

        let sql = `
            SELECT 
                r.id,
                r.booking_reference,
                r.user_id,
                r.booking_date,
                r.status,
                r.rate_snapshot,
                r.quantity_snapshot,
                r.base_amount_snapshot,
                r.booking_charge_snapshot,
                r.total_amount_snapshot,
                r.customer_name,
                r.customer_phone,
                r.identity_proof,
                r.created_at,
                r.updated_at,
                u.username,
                u.full_name AS user_full_name,
                i.resource_id,
                i.resource_code_snapshot,
                i.resource_name_snapshot
            FROM reservations r
            JOIN users u ON r.user_id = u.id
            LEFT JOIN reservation_items i ON r.id = i.reservation_id
            WHERE 1=1
        `;
        const params = [];

        // BR10 / FR6: Users can only view their own bookings; Administrators can view all.
        if (requestingUser.role !== 'ADMINISTRATOR') {
            sql += ` AND r.user_id = ?`;
            params.push(requestingUser.id);
        } else if (filters.user_id) {
            // Admin optionally filters by a specific user
            sql += ` AND r.user_id = ?`;
            params.push(filters.user_id);
        }

        if (filters.status) {
            sql += ` AND r.status = ?`;
            params.push(filters.status);
        }

        if (filters.booking_reference) {
            sql += ` AND r.booking_reference = ?`;
            params.push(filters.booking_reference);
        }

        sql += ` ORDER BY r.id DESC;`;

        const rows = await db.query(sql, params);
        return rows.map(r => ({
            id: r.id,
            booking_reference: r.booking_reference,
            user_id: r.user_id,
            user: {
                username: r.username,
                full_name: r.user_full_name
            },
            resource: {
                id: r.resource_id,
                resource_code: r.resource_code_snapshot,
                name: r.resource_name_snapshot
            },
            booking_date: r.booking_date,
            status: r.status,
            fare_snapshot: {
                unit_rate: parseFloat(r.rate_snapshot),
                quantity: parseInt(r.quantity_snapshot, 10),
                base_amount: parseFloat(r.base_amount_snapshot),
                booking_charge: parseFloat(r.booking_charge_snapshot),
                total_amount: parseFloat(r.total_amount_snapshot)
            },
            customer: {
                name: r.customer_name,
                phone: r.customer_phone,
                identity_proof: r.identity_proof
            },
            created_at: r.created_at,
            updated_at: r.updated_at
        }));
    }

    /**
     * Get single booking by ID with ownership check (BR10 / FR6).
     * @param {number|string} bookingIdentifier 
     * @param {Object} requestingUser 
     * @returns {Promise<Object>}
     */
    static async getBookingById(bookingIdentifier, requestingUser) {
        if (!requestingUser || !requestingUser.id) {
            throw new Error('Authentication required.');
        }

        const isNumeric = !isNaN(Number(bookingIdentifier));
        const sql = `
            SELECT 
                r.id,
                r.booking_reference,
                r.user_id,
                r.booking_date,
                r.status,
                r.rate_snapshot,
                r.quantity_snapshot,
                r.base_amount_snapshot,
                r.booking_charge_snapshot,
                r.total_amount_snapshot,
                r.customer_name,
                r.customer_phone,
                r.identity_proof,
                r.created_at,
                r.updated_at,
                u.username,
                u.full_name AS user_full_name,
                i.resource_id,
                i.resource_code_snapshot,
                i.resource_name_snapshot
            FROM reservations r
            JOIN users u ON r.user_id = u.id
            LEFT JOIN reservation_items i ON r.id = i.reservation_id
            WHERE ${isNumeric ? 'r.id = ?' : 'r.booking_reference = ?'};
        `;
        const rows = await db.query(sql, [bookingIdentifier]);

        if (rows.length === 0) {
            const err = new Error(`Booking '${bookingIdentifier}' not found.`);
            err.statusCode = 404;
            throw err;
        }

        const booking = rows[0];

        // BR10: Users can only view their own bookings
        if (requestingUser.role !== 'ADMINISTRATOR' && booking.user_id !== requestingUser.id) {
            const err = new Error(`Unauthorized: You are not permitted to view booking '${booking.booking_reference}' belonging to another user.`);
            err.statusCode = 403;
            throw err;
        }

        // Fetch status history
        const historyRows = await db.query(
            `SELECT h.id, h.from_status, h.to_status, h.remarks, h.changed_at, u.username AS changed_by_username
             FROM booking_status_history h
             JOIN users u ON h.changed_by_user_id = u.id
             WHERE h.reservation_id = ?
             ORDER BY h.id ASC;`,
            [booking.id]
        );

        return {
            id: booking.id,
            booking_reference: booking.booking_reference,
            user_id: booking.user_id,
            user: {
                username: booking.username,
                full_name: booking.user_full_name
            },
            resource: {
                id: booking.resource_id,
                resource_code: booking.resource_code_snapshot,
                name: booking.resource_name_snapshot
            },
            booking_date: booking.booking_date,
            status: booking.status,
            fare_snapshot: {
                unit_rate: parseFloat(booking.rate_snapshot),
                quantity: parseInt(booking.quantity_snapshot, 10),
                base_amount: parseFloat(booking.base_amount_snapshot),
                booking_charge: parseFloat(booking.booking_charge_snapshot),
                total_amount: parseFloat(booking.total_amount_snapshot)
            },
            customer: {
                name: booking.customer_name,
                phone: booking.customer_phone,
                identity_proof: booking.identity_proof
            },
            history: historyRows,
            created_at: booking.created_at,
            updated_at: booking.updated_at
        };
    }

    /**
     * BR8, BR9 / FR8: User / Admin Booking Cancellation.
     * - Users can cancel only their own bookings.
     * - Only CONFIRMED bookings can be cancelled.
     * - Restores availability exactly once.
     * - Rejects repeated cancellation.
     * 
     * @param {number|string} bookingIdentifier 
     * @param {Object} requestingUser 
     * @returns {Promise<Object>}
     */
    static async cancelBooking(bookingIdentifier, requestingUser) {
        if (!requestingUser || !requestingUser.id) {
            throw new Error('Authentication required.');
        }

        return await db.withTransaction(async (conn) => {
            const isNumeric = !isNaN(Number(bookingIdentifier));
            const [rows] = await conn.query(
                `SELECT r.id, r.booking_reference, r.user_id, r.status, r.quantity_snapshot, i.resource_id
                 FROM reservations r
                 LEFT JOIN reservation_items i ON r.id = i.reservation_id
                 WHERE ${isNumeric ? 'r.id = ?' : 'r.booking_reference = ?'}
                 FOR UPDATE;`,
                [bookingIdentifier]
            );

            if (rows.length === 0) {
                const err = new Error(`Booking '${bookingIdentifier}' not found.`);
                err.statusCode = 404;
                throw err;
            }

            const booking = rows[0];

            // BR10: Ownership check - User can cancel only their own booking
            if (requestingUser.role !== 'ADMINISTRATOR' && booking.user_id !== requestingUser.id) {
                const err = new Error(`Unauthorized: You cannot cancel booking '${booking.booking_reference}' belonging to another user.`);
                err.statusCode = 403;
                throw err;
            }

            // BR8 & BR9: Only CONFIRMED bookings can be cancelled.
            // Reject repeated cancellation or cancellations after check-in/completion.
            if (booking.status === 'CANCELLED') {
                const err = new Error(
                    `Booking '${booking.booking_reference}' is already CANCELLED. Repeated cancellation is rejected; availability cannot be restored multiple times.`
                );
                err.statusCode = 400;
                throw err;
            }

            if (booking.status !== 'CONFIRMED') {
                const err = new Error(
                    `Cannot cancel booking '${booking.booking_reference}' in status '${booking.status}'. Only CONFIRMED bookings are eligible for cancellation.`
                );
                err.statusCode = 400;
                throw err;
            }

            const restoreQty = parseInt(booking.quantity_snapshot, 10);
            const resourceId = booking.resource_id;

            // 1. Update reservation status to CANCELLED
            await conn.query(
                `UPDATE reservations SET status = 'CANCELLED' WHERE id = ?;`,
                [booking.id]
            );

            // 2. BR9: Restore facility availability exactly once
            if (resourceId && restoreQty > 0) {
                await conn.query(
                    `UPDATE resources SET available_quantity = available_quantity + ? WHERE id = ?;`,
                    [restoreQty, resourceId]
                );
            }

            // 3. Record status history
            await conn.query(
                `INSERT INTO booking_status_history (
                    reservation_id, from_status, to_status, changed_by_user_id, remarks
                ) VALUES (?, 'CONFIRMED', 'CANCELLED', ?, ?);`,
                [
                    booking.id,
                    requestingUser.id,
                    `Cancelled by ${requestingUser.role.toLowerCase()} '${requestingUser.username}'. Restored ${restoreQty} facility slot(s).`
                ]
            );

            // Fetch new resource availability
            const [resRows] = await conn.query(`SELECT available_quantity FROM resources WHERE id = ?;`, [resourceId]);
            const newAvailability = resRows.length > 0 ? resRows[0].available_quantity : null;

            return {
                id: booking.id,
                booking_reference: booking.booking_reference,
                status: 'CANCELLED',
                restored_quantity: restoreQty,
                current_facility_availability: newAvailability,
                message: `Booking '${booking.booking_reference}' successfully cancelled. ${restoreQty} slot(s) restored to inventory.`
            };
        });
    }

    /**
     * BR8 / FR7: Administrator Operational Status Progression.
     * Allowed progression: CONFIRMED -> CHECKED_IN (or BOARDED) -> COMPLETED
     * Administrators cannot skip stages (e.g. CONFIRMED -> COMPLETED rejected).
     * Regular users are forbidden from calling this (BR10).
     * 
     * @param {number|string} bookingIdentifier 
     * @param {string} targetStatus 
     * @param {Object} requestingUser 
     * @returns {Promise<Object>}
     */
    static async updateOperationalStatus(bookingIdentifier, targetStatus, requestingUser) {
        if (!requestingUser || !requestingUser.id) {
            throw new Error('Authentication required.');
        }

        // BR10 / FR9: Allow only administrators to advance operational status
        if (requestingUser.role !== 'ADMINISTRATOR') {
            const err = new Error('Unauthorized: Only administrators are authorized to update operational status.');
            err.statusCode = 403;
            throw err;
        }

        if (!targetStatus || typeof targetStatus !== 'string') {
            throw new Error('Target status is required.');
        }

        // Standardize status name: support CHECKED_IN or BOARDED as the intermediate stage
        let normalizedTarget = targetStatus.trim().toUpperCase();
        if (normalizedTarget === 'BOARDED') {
            normalizedTarget = 'CHECKED_IN';
        }

        const validStatuses = ['CHECKED_IN', 'COMPLETED'];
        if (!validStatuses.includes(normalizedTarget)) {
            throw new Error(`Invalid operational target status: '${targetStatus}'. Allowed operational stages are CHECKED_IN (or BOARDED) and COMPLETED.`);
        }

        return await db.withTransaction(async (conn) => {
            const isNumeric = !isNaN(Number(bookingIdentifier));
            const [rows] = await conn.query(
                `SELECT id, booking_reference, status, user_id FROM reservations 
                 WHERE ${isNumeric ? 'id = ?' : 'booking_reference = ?'}
                 FOR UPDATE;`,
                [bookingIdentifier]
            );

            if (rows.length === 0) {
                const err = new Error(`Booking '${bookingIdentifier}' not found.`);
                err.statusCode = 404;
                throw err;
            }

            const booking = rows[0];
            const currentStatus = booking.status;

            // BR8 / FR7: Enforce strict stage-by-stage progression:
            // Stage 1: CONFIRMED -> Stage 2: CHECKED_IN -> Stage 3: COMPLETED
            if (currentStatus === 'CONFIRMED') {
                if (normalizedTarget !== 'CHECKED_IN') {
                    const err = new Error(
                        `Invalid stage transition: Cannot advance booking '${booking.booking_reference}' directly from 'CONFIRMED' to '${targetStatus}'. ` +
                        `Administrators cannot skip stages; booking must first transition to 'CHECKED_IN' (or 'BOARDED').`
                    );
                    err.statusCode = 400;
                    throw err;
                }
            } else if (currentStatus === 'CHECKED_IN') {
                if (normalizedTarget !== 'COMPLETED') {
                    const err = new Error(
                        `Invalid stage transition: Booking '${booking.booking_reference}' is already 'CHECKED_IN'. It can only advance to 'COMPLETED'.`
                    );
                    err.statusCode = 400;
                    throw err;
                }
            } else if (currentStatus === 'COMPLETED') {
                const err = new Error(
                    `Booking '${booking.booking_reference}' is already COMPLETED. No further status transitions are permitted.`
                );
                err.statusCode = 400;
                throw err;
            } else if (currentStatus === 'CANCELLED') {
                const err = new Error(
                    `Booking '${booking.booking_reference}' has been CANCELLED. Cancelled bookings cannot advance operational status.`
                );
                err.statusCode = 400;
                throw err;
            } else {
                const err = new Error(`Unknown current status '${currentStatus}' for booking '${booking.booking_reference}'.`);
                err.statusCode = 400;
                throw err;
            }

            // Update status
            await conn.query(
                `UPDATE reservations SET status = ? WHERE id = ?;`,
                [normalizedTarget, booking.id]
            );

            // Record status history audit
            await conn.query(
                `INSERT INTO booking_status_history (
                    reservation_id, from_status, to_status, changed_by_user_id, remarks
                ) VALUES (?, ?, ?, ?, ?);`,
                [
                    booking.id,
                    currentStatus,
                    normalizedTarget,
                    requestingUser.id,
                    `Operational status advanced from ${currentStatus} to ${normalizedTarget} by Administrator '${requestingUser.username}'.`
                ]
            );

            return {
                id: booking.id,
                booking_reference: booking.booking_reference,
                previous_status: currentStatus,
                status: normalizedTarget,
                message: `Booking operational status successfully advanced to ${normalizedTarget}.`
            };
        });
    }
}

module.exports = BookingService;
