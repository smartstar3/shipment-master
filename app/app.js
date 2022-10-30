// app.js - top-level file to config/load/start OLX application
//
'use strict';
/* eslint-disable-nextline sort-requires/sort-requires */
const { Sentry } = require('./helpers/logger');

const express = require('express');

// logger initialization must be done first
const { getLogger, getModuleContext } = require('@onelive-dev/x-logger');

const apiRouter = require('./api/index');
const mongo = require('./helpers/mongo');
const { httpPort } = require('./config');

const moduleContext = getModuleContext();

// Start Express the load the rest of the system passing in the App object
//
const init = async () => {
    const logger = getLogger({
        ...moduleContext,
        method: 'init'
    });
    await mongo.connect();

    const app = express();
    app.enable('trust proxy');

    app.use(apiRouter);

    app.listen(httpPort, () => {
        logger.info('Listen OK', { httpPort });
    });
};

// Kickstart App
init().catch((err) => {
    const logger = getLogger({
        ...moduleContext,
        method: 'init.catch'
    });
    const errMsg = 'App initialization failed';
    logger.error(errMsg, err);
    Sentry.captureMessage(errMsg);
    Sentry.captureException(err);

    // shut down
    throw err;
});
