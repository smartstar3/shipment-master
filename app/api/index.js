const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { getLogger } = require('@onelive-dev/x-logger');

const externalV1Router = require('./external');
const grapqhql = require('../api/internal/graphql');
const initResponseLogger = require('./lib/middleware/responseLogger');
const integrationRouter = require('./integrations');
const internalRoutes = require('../api/internal/rest');
const notFound = require('./lib/middleware/notFound');
const trackingMeta = require('./lib/middleware/trackingMeta');
const { healthcheck, healthcheckError } = require('./lib/middleware/healthchecks');
const { Sentry } = require('../helpers/logger');
const { terminalErrorHandler } = require('./lib/middleware/errorHandlers');

const logger = getLogger(module);

/*
Initialize middleware
 */

const apiLimiter = rateLimit({
    windowMs: typeof process.env.RATE_LIMIT_WINDOW_MS === 'undefined'
        ? 60 * 1000
        : process.env.RATE_LIMIT_WINDOW_MS,
    max: typeof process.env.RATE_LIMIT_MAX_REQUEST === 'undefined'
        ? 100
        : process.env.RATE_LIMIT_MAX_REQUEST
});

const responseLogger = initResponseLogger({ logger });

/*
Initialize main API router
 */

const main = express.Router();

logger.info('Installing helmet middleware');
main.use(helmet());

logger.info('Installing rate limiting middleware');
main.use(apiLimiter);

logger.info('Installing global request and response decoration middleware');
logger.info('Installing tracking metadata middleware');
main.use(trackingMeta);

logger.info('Installing logging middleware');
logger.info('Installing response logger');
main.use(responseLogger);
logger.info('Installing Sentry request handler');
main.use(Sentry.Handlers.requestHandler());

logger.info('Installing health check middleware');
main.route('/status')
    .head(healthcheck)
    .get(healthcheck);

main.route('/status/boom')
    .head(healthcheckError)
    .get(healthcheckError);

logger.info('Installing integration router');
main.use('/integrations', integrationRouter);

logger.info('Installing external API routers');
externalV1Router.installTo(main);

logger.info('Installing internal API routes');
// we still haven't parsed the request body at this point
logger.info('Installing body parsing middleware');
main.use(express.json());

logger.info('Installing REST routes');
internalRoutes(main);

logger.info('Installing GraphQL routes');
grapqhql(main);

main.use(notFound);
main.use(terminalErrorHandler);

module.exports = main;
