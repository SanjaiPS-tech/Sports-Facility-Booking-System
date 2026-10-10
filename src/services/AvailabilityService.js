/**
 * AvailabilityService
 * Handles facility search, schedule retrieval, and availability queries (FR1, BR2).
 */
const db = require('../config/database');

class AvailabilityService {
    /**
     * Search and retrieve active sports facilities with schedule, rate, and availability (FR1).
     * @param {Object} filters
     * @returns {Promise<Array>}
     */
    static async searchFacilities(filters = {}) {
        let sql = `
            SELECT 
                r.id,
                r.resource_code,
                r.name,
                r.category,
                r.hourly_rate,
                r.available_quantity,
                r.total_capacity,
                r.is_active,
                s.day_of_week AS schedule_days,
                TIME_FORMAT(s.start_time, '%H:%i') AS start_time,
                TIME_FORMAT(s.end_time, '%H:%i') AS end_time,
                s.slot_name
            FROM resources r
            LEFT JOIN schedules s ON r.id = s.resource_id AND s.is_active = TRUE
            WHERE 1=1
        `;
        const params = [];

        // By default show only active facilities unless specified
        if (!filters.includeInactive) {
            sql += ` AND r.is_active = TRUE`;
        }

        if (filters.query && filters.query.trim()) {
            const term = `%${filters.query.trim()}%`;
            sql += ` AND (r.name LIKE ? OR r.category LIKE ? OR r.resource_code LIKE ?)`;
            params.push(term, term, term);
        }

        if (filters.category && filters.category.trim()) {
            sql += ` AND r.category = ?`;
            params.push(filters.category.trim());
        }

        if (filters.resource_code && filters.resource_code.trim()) {
            sql += ` AND r.resource_code = ?`;
            params.push(filters.resource_code.trim());
        }

        sql += ` ORDER BY r.resource_code ASC;`;

        const rows = await db.query(sql, params);
        return rows.map(r => ({
            id: r.id,
            resource_code: r.resource_code,
            name: r.name,
            category: r.category,
            hourly_rate: parseFloat(r.hourly_rate),
            available_quantity: parseInt(r.available_quantity, 10),
            total_capacity: parseInt(r.total_capacity, 10),
            is_active: Boolean(r.is_active),
            schedule: {
                days: r.schedule_days || 'All Days (Mon - Sun)',
                start_time: r.start_time || '06:00',
                end_time: r.end_time || '22:00',
                slot_name: r.slot_name || 'Standard 60-Minute Slot'
            }
        }));
    }

    /**
     * Get a single facility by its resource code (e.g. R101)
     * @param {string} resourceCode 
     * @returns {Promise<Object|null>}
     */
    static async getFacilityByCode(resourceCode) {
        const rows = await db.query(
            `SELECT id, resource_code, name, category, hourly_rate, available_quantity, total_capacity, is_active
             FROM resources WHERE resource_code = ?;`,
            [resourceCode]
        );
        if (rows.length === 0) return null;
        const r = rows[0];
        return {
            id: r.id,
            resource_code: r.resource_code,
            name: r.name,
            category: r.category,
            hourly_rate: parseFloat(r.hourly_rate),
            available_quantity: parseInt(r.available_quantity, 10),
            total_capacity: parseInt(r.total_capacity, 10),
            is_active: Boolean(r.is_active)
        };
    }

    /**
     * Get a single facility by its ID
     * @param {number} resourceId 
     * @returns {Promise<Object|null>}
     */
    static async getFacilityById(resourceId) {
        const rows = await db.query(
            `SELECT id, resource_code, name, category, hourly_rate, available_quantity, total_capacity, is_active
             FROM resources WHERE id = ?;`,
            [resourceId]
        );
        if (rows.length === 0) return null;
        const r = rows[0];
        return {
            id: r.id,
            resource_code: r.resource_code,
            name: r.name,
            category: r.category,
            hourly_rate: parseFloat(r.hourly_rate),
            available_quantity: parseInt(r.available_quantity, 10),
            total_capacity: parseInt(r.total_capacity, 10),
            is_active: Boolean(r.is_active)
        };
    }
}

module.exports = AvailabilityService;
