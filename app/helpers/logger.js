// logger.js - central logging utility
//
'use strict';
const Sentry = require('@sentry/node');

const { initialize } = require('@onelive-dev/x-logger');

const { logLevel, logzioToken, useLogzio, nodeEnv } = require('../config');
const { setProp } = require('./utils');

const isHostedEnv = nodeEnv === 'production' || nodeEnv === 'staging';
const isTest = nodeEnv === 'test';

const initLogger = () => {
    const opts = {
        context: { app: 'olx', env: nodeEnv },
        level: logLevel,
        silent: isTest,
        // @todo perhaps turn off console logging in hosted staging / production envs once we are comfortable with logzio
        useConsole: (useLogzio === false || isHostedEnv)
    };

    // only use logzio log transport when token is present on config and this is not a dev environment
    if (useLogzio && logzioToken) {
        opts.tokens = { logzio: logzioToken };
    }

    const logger = initialize(opts);

    if (opts.tokens) {
        opts.tokens = Object.keys(opts.tokens).reduce(
            (redacted, name) => {
                setProp(redacted, name, '[REDACTED]');
                return redacted;
            },
            {}
        );
    }
    logger.info('logger initialized', { opts });
};

initLogger();

// @todo move sentry into x-logger and deprecate direct use in OLX
Sentry.init({ dsn: process.env.SENTRY_DSN });

module.exports = { Sentry };
