/**
 * Authentication and Role Simulation Middleware
 * Implements two roles: User and Administrator (FR9, BR10).
 * Simulates user sessions via X-User-Id, X-Role, or query/body parameters.
 */
const db = require('../config/database');

/**
 * Extract active user context and attach to req.user.
 */
async function authenticateUser(req, res, next) {
    try {
        const identifier = req.headers['x-user-id'] || 
                           req.headers['x-username'] || 
                           req.query.simulate_user || 
                           (req.body && req.body.simulate_user);

        let userRow = null;

        if (identifier) {
            const isNumeric = !isNaN(Number(identifier));
            const rows = await db.query(
                `SELECT id, username, full_name, email, phone, role FROM users WHERE ${isNumeric ? 'id = ?' : 'username = ?'};`,
                [identifier]
            );
            if (rows.length > 0) {
                userRow = rows[0];
            }
        }

        // If no user found or none specified, default to user1 (John Doe)
        if (!userRow) {
            const rows = await db.query(
                `SELECT id, username, full_name, email, phone, role FROM users WHERE username = 'user1';`
            );
            userRow = rows.length > 0 ? rows[0] : { id: 1, username: 'user1', full_name: 'John Doe', role: 'USER' };
        }

        // Allow overriding role via header for explicit testing if requested
        if (req.headers['x-simulate-role']) {
            userRow.role = req.headers['x-simulate-role'].toUpperCase();
        }

        req.user = userRow;
        next();
    } catch (err) {
        next(err);
    }
}

/**
 * Guard middleware enforcing specified role.
 * @param {string} requiredRole - 'USER' or 'ADMINISTRATOR'
 */
function requireRole(requiredRole) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required. Please select or log in as a user.'
            });
        }

        if (req.user.role !== requiredRole) {
            return res.status(403).json({
                success: false,
                error: `Unauthorized access: Action requires '${requiredRole}' privileges. Current simulated user '${req.user.username}' has role '${req.user.role}'.`
            });
        }

        next();
    };
}

module.exports = {
    authenticateUser,
    requireRole
};
