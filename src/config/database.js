/**
 * Database Connection Pool and Transaction Helper
 * Sports Facility Booking System
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'vsp',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'test_sports_facility_db',
    waitForConnections: true,
    connectionLimit: 15,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    timezone: 'Z',
    dateStrings: true
});

/**
 * Execute a callback within an isolated ACID transaction.
 * Automatically performs COMMIT on success, or ROLLBACK on error.
 * 
 * @param {Function} callback - async (connection) => Promise<any>
 * @returns {Promise<any>}
 */
async function withTransaction(callback) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const result = await callback(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

/**
 * Direct query execution on the connection pool.
 * @param {string} sql 
 * @param {Array} params 
 */
async function query(sql, params = []) {
    const [rows, fields] = await pool.query(sql, params);
    return rows;
}

module.exports = {
    pool,
    query,
    withTransaction
};
