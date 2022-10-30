const errors = require('errors');

/**
 * Middleware intended to generate a Not Found (404) error.
 * This should typically be placed after all middleware on a router except final error handling middleware.
 *
 * @param {object} req
 * @param {object} res
 * @param {function} next
 * @returns void
 */
const notFoundHandler = (req, res, next) => {
    next(new errors.NotFoundError('The path does not exist'));
};

module.exports = notFoundHandler;
