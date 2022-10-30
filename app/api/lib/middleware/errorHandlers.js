const AuthorizationError = require('passport/lib/errors/authenticationerror');
const { UnauthorizedError: ExpressJWTUnauthorizedError } = require('express-jwt');
const { ValidationError } = require('joi');

const { getLogger } = require('@onelive-dev/x-logger');
const { InternalServerError, UnprocessableEntityError, XError, UnauthorizedError } = require('errors');

const { CelebrateError } = require('celebrate');
const { Sentry } = require('../../../helpers/logger');

const logger = getLogger(module);

// intent is to change errors-js lib toJSON methods to return better object representation { name, message, stack, ... }
// for exception logging
// ...and use this to maintain API response contract
const buildResponse = (req, err) => {
    return {
        error_code: err.code || 500,
        error_msg: err.message,
        // only allow underlying error field info to be shown for validation errors
        error_fields: (err.code === 422) ? err.errors : [],
        request_id: req.uuid
    };
};

const sendResponse = (req, res, err) => {
    res.status(err.code).json(buildResponse(req, err));
};

/**
 * This middleware is intended to be installed immediately after authentication or authorization
 * middleware to filter out auth failures with the intent of sending final response to caller.
 * This prevents further response processing in subsequent middleware. If headers have already
 * been sent we still send the decline response even though we are unable to adjust the status
 * code in header.
 *
 * @param {Error} err
 * @param {object} req
 * @param {object} res
 * @param {function} next
 * @returns void
 */
const authErrorHandler = (err, req, res, next) => {
    const requestId = req.uuid;
    const log = logger.child({ method: 'authErrorHandler', requestId });
    log.debug('Entering auth error handler');

    const errOrig = err;
    let errFinal = errOrig;

    if (
        // passport
        errOrig instanceof AuthorizationError ||
        // express-jwt
        errOrig instanceof ExpressJWTUnauthorizedError
    ) {
        // replace with generic instance of UnauthorizedError
        errFinal = new UnauthorizedError();
    }

    // defer any errors not related to auth to subsequent error handling middleware
    if (errFinal.code !== 401 && errFinal.code !== 403) {
        return next(errFinal);
    }

    if (res.headersSent) {
        const errMsg = 'Auth error handling middleware invoked after headers sent. This is a misconfiguration';
        Sentry.captureMessage(errMsg);
        log.error(errMsg);
    }

    log.debug('Sending auth decline message');
    sendResponse(req, res, errFinal);
};

/**
 * This middleware is intended to be installed as the last piece of middleware on an Express
 * application or Router with the intent of serving up a final error response to caller.  The
 * one exception here is when the headers are already sent, we pass the error on to let it
 * bubble up all the way to the default Express error handler for proper response termination
 * behavior.
 *
 * @param {Error} err
 * @param {Request} req
 * @param {Response} res
 * @param {Function} next
 * @returns void
 */
const terminalErrorHandler = (err, req, res, next) => {
    const requestId = req.uuid;
    const log = logger.child({ method: 'terminalErrorHandler', requestId });
    log.debug('Entering terminal error handler');

    // handle (unexpected) case where headers are already sent
    if (res.headersSent) {
        Sentry.captureException(err);
        log.error('Terminal error handler caught error after headers sent', err);
        // just send generic InternalServerError to top level express error handler
        return next(new InternalServerError());
    }

    const errOrig = err;
    let errFinal = errOrig;

    // convert validation errors
    if (errOrig instanceof CelebrateError) {
        errFinal = UnprocessableEntityError.fromCelebrateError(errOrig);
    } else if (errOrig instanceof ValidationError) {
        const errors = errOrig.details.map(({ message, path }) => {
            return {
                name: path.join('.'),
                message
            };
        });
        errFinal = new UnprocessableEntityError({ errors });
    }

    if (errFinal instanceof XError === false || errFinal.code >= 500) {
        log.error('Terminal error handler received internal or non-standard error', errOrig);
        Sentry.captureException(errOrig);

        // decorate original error onto response object to give response logger this error context
        res.error = errOrig;

        // replace with generic InternalServerError for final response processing
        errFinal = new InternalServerError();
    } else if (errFinal.code === 401 || errFinal.code === 403) {
        log.error('Auth error found in terminal error handler. This is a misconfiguration.', errFinal);
    } else {
        log.warn(`Terminal error handler caught ${errFinal.code} ${errFinal.message}`);
    }

    sendResponse(req, res, errFinal);
};

module.exports = {
    authErrorHandler,
    terminalErrorHandler
};
