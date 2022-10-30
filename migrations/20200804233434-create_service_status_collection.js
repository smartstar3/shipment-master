// migrations/create_histories_collection -- initial migration to create histories collection
//
'use strict';
// initialize logger first
const { getModuleContext, initialize } = require('@onelive-dev/x-logger');

const logger = initialize({ context: getModuleContext(module) });

const mongo = require('../app/helpers/mongo');
const serviceStatus = require('./../app/models/serviceStatus');

module.exports = {
    async up () {
        await mongo.connect();

        logger.info('create serviceStatuses');
        await serviceStatus.create();
    },

    async down () {
        await mongo.connect();

        logger.info('drop serviceStatuses');
        await serviceStatus.drop();
    }
};
