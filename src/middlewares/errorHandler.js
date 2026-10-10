/**
 * Global Error Handler Middleware
 * Formats errors into clear, consistent JSON responses (FR9, BR10).
 */
function errorHandler(err, req, res, next) {
    const statusCode = err.statusCode || (err.message && err.message.includes('Unauthorized') ? 403 : 400);

    // Identify common validation / business rule errors
    const response = {
        success: false,
        error: err.message || 'An unexpected error occurred.',
        timestamp: new Date().toISOString()
    };

    if (process.env.NODE_ENV === 'development') {
        response.stack = err.stack;
    }

    res.status(statusCode).json(response);
}

module.exports = errorHandler;
