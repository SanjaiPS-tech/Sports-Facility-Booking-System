/**
 * Booking Controller
 * Orchestrates booking creation, listing, cancellation, and status transitions (FR2-FR9).
 */
const BookingService = require('../services/BookingService');

class BookingController {
    /**
     * Create a new reservation (FR5, BR1-BR7).
     */
    static async createBooking(req, res, next) {
        try {
            const bookingResult = await BookingService.createReservation(req.body, req.user);
            res.status(201).json({
                success: true,
                message: `Reservation ${bookingResult.booking_reference} confirmed successfully.`,
                data: bookingResult
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * List bookings (FR6, BR10).
     * Regular users see only their own bookings; Administrators see all bookings.
     */
    static async listBookings(req, res, next) {
        try {
            const filters = {
                status: req.query.status,
                user_id: req.query.user_id,
                booking_reference: req.query.booking_reference
            };
            const bookings = await BookingService.getBookings(req.user, filters);
            res.json({
                success: true,
                user: {
                    id: req.user.id,
                    username: req.user.username,
                    role: req.user.role
                },
                count: bookings.length,
                data: bookings
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Get single booking details with ownership check (FR6, BR10).
     */
    static async getBookingDetails(req, res, next) {
        try {
            const { idOrReference } = req.params;
            const booking = await BookingService.getBookingById(idOrReference, req.user);
            res.json({
                success: true,
                data: booking
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Cancel confirmed booking (FR8, BR8, BR9, BR10).
     */
    static async cancelBooking(req, res, next) {
        try {
            const { idOrReference } = req.params;
            const result = await BookingService.cancelBooking(idOrReference, req.user);
            res.json({
                success: true,
                data: result
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Update operational status (FR7, BR8, BR10).
     * Allowed only for ADMINISTRATOR.
     */
    static async updateOperationalStatus(req, res, next) {
        try {
            const { idOrReference } = req.params;
            const { status } = req.body;
            const result = await BookingService.updateOperationalStatus(idOrReference, status, req.user);
            res.json({
                success: true,
                data: result
            });
        } catch (err) {
            next(err);
        }
    }
}

module.exports = BookingController;
