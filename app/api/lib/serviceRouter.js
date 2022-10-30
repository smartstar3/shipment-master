const express = require('express');

const { getLogger, getModuleContext, XLogger } = require('@onelive-dev/x-logger');

const notFoundHandler = require('./middleware/notFound');
const ServiceRoute = require('./serviceRoute');
const {
    authErrorHandler,
    terminalErrorHandler
} = require('./middleware/errorHandlers');
const { deepFreeze } = require('../../helpers/utils');
const { Sentry } = require('../../helpers/logger');
const { wrapAsyncMiddleware } = require('./utils');

const moduleContext = getModuleContext(module);

/**
 * Factory function for vending basic Express Router with application of
 * predefined middleware hooks to be applied in order, with reasonable default authentication,
 * authorization, and terminal error handling.
 *
 * A vended ServiceRouter is expected to handle all responses, leaving no request processing or response
 * modification/sending responsibility to subsequently mounted routers.
 */
function serviceRouter (opts) {
    const {
        label = 'unknown',
        description,
        path = '/',
        hooks: optHooks = {},
        logger = getLogger()
    } = opts;

    const router = express.Router();

    const log = (logger instanceof XLogger)
        ? logger.child({ ...moduleContext, label, path })
        : logger;

    router.label = label;
    router.description = description;
    router.path = path;
    router.logger = log;

    // build hooks with opts overrides
    // we use Map here to guarantee order of iteration based on
    // order of defaultHooks keys
    this.hookMap = new Map();
    const setHook = ([key, value]) => {
        if (!Array.isArray(value)) {
            throw new TypeError(`[${label}] All opts.hooks values must be arrays`);
        }
        this.hookMap.set(key, value);
    };

    Object.entries(serviceRouter.defaultHooks).forEach(setHook);
    Object.entries(optHooks).forEach(setHook);

    // install middleware for hooks
    const installMiddleware = (fnOrServiceRoute) => {
        const mwLabel = fnOrServiceRoute.label || fnOrServiceRoute.name || 'unknown';

        if (fnOrServiceRoute instanceof ServiceRoute) {
            fnOrServiceRoute.installTo(router);
            return;
        }

        if (typeof fnOrServiceRoute === 'function') {
            logger.info(`[${label}] Installing '${mwLabel} middleware`);
            router.use(wrapAsyncMiddleware(fnOrServiceRoute));
            return;
        }

        const errMsg = `[${label}] ServiceRouter.installMiddleware() received unexpected value`;
        const err = new TypeError(errMsg);
        logger.error(errMsg);
        Sentry.captureException(err);
        throw err;
    };

    for (const [stage, hooks] of this.hookMap) {
        log.info(`Installing hooks for stage '${stage}'`);
        hooks.forEach(installMiddleware);
    }

    router.installTo = (target) => {
        log.info(`Installing router to path '${path}'`);
        target.use(path, router);
        return target;
    };

    log.info('Ready for installation');
    return router;
}

serviceRouter.defaultHooks = deepFreeze({
    // any routes to be executed regardless of auth stat or that do not require auth go here
    preAuthentication: [],
    // authentication middleware, if used, goes here
    authentication: [],
    // post authentication error handler
    postAuthentication: [authErrorHandler],
    // any routes which do not require authorization authorization or are used to prep for authorization
    // step go here
    // typically, we would only start interacting with the request and/or data store after having authenticated caller
    preAuthorization: [],
    // authorization middleware, if used, goes here
    authorization: [],
    // post-authorization error handler
    postAuthorization: [authErrorHandler],
    // any final handlers which should be processed after authorization, but before main routes
    // ideally we have not yet had to parse the request body, so we do that by default here
    preRoute: [express.json()],
    routes: [],
    notFound: [notFoundHandler],
    final: [terminalErrorHandler]
});

module.exports = serviceRouter;
