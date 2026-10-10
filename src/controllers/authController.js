/**
 * Auth Controller
 * Manages sample accounts and active role simulation (User / Administrator).
 */
const db = require('../config/database');

class AuthController {
    /**
     * List all sample accounts (User 1, User 2, Admin).
     */
    static async listUsers(req, res, next) {
        try {
            const users = await db.query(
                `SELECT id, username, full_name, email, phone, role FROM users ORDER BY id ASC;`
            );
            res.json({
                success: true,
                data: users
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Get currently active simulated user.
     */
    static async getCurrentUser(req, res) {
        res.json({
            success: true,
            user: req.user
        });
    }
}

module.exports = AuthController;
