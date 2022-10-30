const express = require('express');

// const shippoRouter = require('./shippo');

/**
 * The integrationRouter is just a bare bones aggregator for specific integration ServiceRouters.
 * This router does no body parsing, applies no auth mechanism, and performs no error handling,
 * leaving these instead to individual integrations routers, which should apply appropriate auth
 * and terminal error handling.
 */
const integrationRouter = express.Router();
// shippoRouter.installTo(integrationRouter);

module.exports = integrationRouter;
