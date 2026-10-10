/**
 * Sports Facility Booking System - Main Server Entrypoint
 * Technology Stack: Node.js, Express, MySQL, Vanilla HTML/CSS/JS
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./src/routes/api');
const errorHandler = require('./src/middlewares/errorHandler');
const db = require('./src/config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));

// Mount API routes
app.use('/api', apiRoutes);

// Single Page Application Fallback for static HTML
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ success: false, error: 'API endpoint not found.' });
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global Error Handler
app.use(errorHandler);

// Server startup & database connectivity verification
async function startServer() {
    try {
        // Test database connectivity
        await db.query('SELECT 1 + 1 AS db_check;');
        console.log('[DATABASE] MySQL connection pool established and verified.');

        const server = app.listen(PORT, () => {
            console.log(`=======================================================`);
            console.log(`  Sports Facility Booking System is LIVE`);
            console.log(`  URL: http://localhost:${PORT}`);
            console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`  Database: ${process.env.DB_NAME || 'test_sports_facility_db'}`);
            console.log(`=======================================================`);
        });

        // Graceful shutdown handling
        const gracefulShutdown = async () => {
            console.log('\n[SERVER] Received termination signal. Closing HTTP server and DB pool...');
            server.close(async () => {
                await db.pool.end();
                console.log('[SERVER] Server shut down gracefully.');
                process.exit(0);
            });
        };

        process.on('SIGINT', gracefulShutdown);
        process.on('SIGTERM', gracefulShutdown);

        return server;
    } catch (err) {
        console.error('[SERVER ERROR] Failed to start server:', err);
        process.exit(1);
    }
}

if (require.main === module) {
    startServer();
}

module.exports = { app, startServer };
