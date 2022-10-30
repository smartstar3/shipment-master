const { getLogger } = require('@onelive-dev/x-logger');
const { PushNotificationRunner } = require('hermod');
const { SQSWorker, InMemoryWorker } = require('scv');

const gconfig = require('../../config');
const hermod = require('../hermod');
const kobayashi = require('../kobayashi');
const transport = require('../transport');
const { DetermineNotifications, ProcessSourceRunner, ProcessRowRunner } = require('./runners');

const logger = getLogger(module);

let worker = null;

const get = () => {
    if (!worker) {
        const Worker = gconfig.nodeEnv === 'test' ? InMemoryWorker : SQSWorker;
        worker = new Worker(
            {
                determineNotifications: DetermineNotifications,
                processSource: ProcessSourceRunner,
                processRow: ProcessRowRunner,
                pushNotification: PushNotificationRunner
            },
            {
                gateway: {
                    ...transport.getGateways(),
                    ...kobayashi.getGateways(),
                    ...hermod.getGateways()
                },
                logger
            }
        );
    }

    return worker;
};

module.exports = {
    get
};
