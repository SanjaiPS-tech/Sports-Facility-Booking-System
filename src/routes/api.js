/**
 * API Routes Definition
 * Sports Facility Booking System
 */
const express = require('express');
const router = express.Router();

const FacilityController = require('../controllers/facilityController');
const BookingController = require('../controllers/bookingController');
const AuthController = require('../controllers/authController');
const { authenticateUser, requireRole } = require('../middlewares/authMiddleware');
const resetDatabase = require('../../database/reset');

// Attach user authentication / simulation to all API routes
router.use(authenticateUser);

// --- Auth & Role Simulation Endpoints ---
router.get('/auth/users', AuthController.listUsers);
router.get('/auth/me', AuthController.getCurrentUser);

// --- Facility & Availability Endpoints (FR1, FR3) ---
router.get('/facilities', FacilityController.searchFacilities);
router.get('/facilities/:idOrCode', FacilityController.getFacilityDetails);
router.post('/facilities/quote', FacilityController.calculateQuote);

// --- Booking & Reservation Endpoints (FR2-FR9) ---
router.post('/bookings', BookingController.createBooking);
router.get('/bookings', BookingController.listBookings);
router.get('/bookings/:idOrReference', BookingController.getBookingDetails);
router.post('/bookings/:idOrReference/cancel', BookingController.cancelBooking);

// Administrator only operational lifecycle updates (FR7, BR8, BR10)
router.patch('/bookings/:idOrReference/status', requireRole('ADMINISTRATOR'), BookingController.updateOperationalStatus);

// --- System Testing / Demo Helper ---
router.post('/system/reset', async (req, res, next) => {
    try {
        await resetDatabase();
        res.json({
            success: true,
            message: 'Database successfully reset and re-seeded with synthetic demonstration data.'
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
