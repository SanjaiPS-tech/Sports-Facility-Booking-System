/**
 * Database Reset and Seed Script
 * Drops existing tables (or wipes data), re-creates schema, and inserts synthetic seed data.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function resetDatabase() {
    const config = {
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT, 10) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        multipleStatements: true
    };

    console.log(`[DB RESET] Connecting to MySQL at ${config.host}:${config.port} as ${config.user || '(anonymous)'}...`);

    let connection;
    try {
        connection = await mysql.createConnection(config);
        const dbName = process.env.DB_NAME || 'test_sports_facility_db';

        console.log(`[DB RESET] Ensuring database \`${dbName}\` exists...`);
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
        await connection.query(`USE \`${dbName}\`;`);

        // Read and execute schema
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        console.log('[DB RESET] Executing schema.sql DDL...');
        await connection.query(schemaSql);

        // Wipe existing records cleanly in reverse FK order to ensure reproducible test state
        console.log('[DB RESET] Cleaning existing records for clean seed state...');
        await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
        await connection.query('TRUNCATE TABLE booking_status_history;');
        await connection.query('TRUNCATE TABLE reservation_items;');
        await connection.query('TRUNCATE TABLE reservations;');
        await connection.query('TRUNCATE TABLE schedules;');
        await connection.query('TRUNCATE TABLE resources;');
        await connection.query('TRUNCATE TABLE users;');
        await connection.query('SET FOREIGN_KEY_CHECKS = 1;');

        // Read and execute seed
        const seedPath = path.join(__dirname, 'seed.sql');
        const seedSql = fs.readFileSync(seedPath, 'utf8');
        console.log('[DB RESET] Executing seed.sql Synthetic Demonstration Data...');
        await connection.query(seedSql);

        // Verify seeded resources
        const [rows] = await connection.query('SELECT resource_code, name, hourly_rate, available_quantity FROM resources ORDER BY resource_code ASC;');
        console.log('[DB RESET] Verification of Seeded Resources:');
        console.table(rows);

        const [users] = await connection.query('SELECT id, username, full_name, role FROM users ORDER BY id ASC;');
        console.log('[DB RESET] Verification of Sample Accounts:');
        console.table(users);

        console.log('[DB RESET] Database initialization and seed completed successfully!');
    } catch (err) {
        console.error('[DB RESET ERROR]', err);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

if (require.main === module) {
    resetDatabase();
}

module.exports = resetDatabase;
