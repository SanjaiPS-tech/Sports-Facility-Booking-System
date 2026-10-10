/**
 * Facility Controller
 * Handles facility search, details, and fare quotation (FR1, FR3).
 */
const AvailabilityService = require('../services/AvailabilityService');
const BookingService = require('../services/BookingService');

class FacilityController {
    static async searchFacilities(req, res, next) {
        try {
            const filters = {
                query: req.query.q || req.query.query,
                category: req.query.category,
                resource_code: req.query.code,
                includeInactive: req.query.include_inactive === 'true'
            };
            const facilities = await AvailabilityService.searchFacilities(filters);
            res.json({
                success: true,
                count: facilities.length,
                data: facilities
            });
        } catch (err) {
            next(err);
        }
    }

    static async getFacilityDetails(req, res, next) {
        try {
            const { idOrCode } = req.params;
            const isNumeric = !isNaN(Number(idOrCode));
            const facility = isNumeric 
                ? await AvailabilityService.getFacilityById(idOrCode)
                : await AvailabilityService.getFacilityByCode(idOrCode);

            if (!facility) {
                return res.status(404).json({
                    success: false,
                    error: `Sports facility '${idOrCode}' not found.`
                });
            }

            res.json({
                success: true,
                data: facility
            });
        } catch (err) {
            next(err);
        }
    }

    static async calculateQuote(req, res, next) {
        try {
            const { resource_code, resource_id, quantity } = req.body;
            const identifier = resource_id || resource_code;

            if (!identifier) {
                return res.status(400).json({
                    success: false,
                    error: 'Resource identifier (resource_code or resource_id) is required.'
                });
            }

            const facility = !isNaN(Number(identifier))
                ? await AvailabilityService.getFacilityById(identifier)
                : await AvailabilityService.getFacilityByCode(identifier);

            if (!facility) {
                return res.status(404).json({
                    success: false,
                    error: `Sports facility '${identifier}' not found.`
                });
            }

            const validatedQty = BookingService.validateQuantity(quantity);
            const quote = BookingService.calculateFare(facility.hourly_rate, validatedQty);

            res.json({
                success: true,
                facility: {
                    resource_code: facility.resource_code,
                    name: facility.name,
                    hourly_rate: facility.hourly_rate,
                    available_quantity: facility.available_quantity
                },
                quote
            });
        } catch (err) {
            next(err);
        }
    }
}

module.exports = FacilityController;
