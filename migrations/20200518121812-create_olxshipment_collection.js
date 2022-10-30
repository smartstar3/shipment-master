// migrations/create_olxshipment -- initial migration to create olxshipment collection
//
'use strict';
// initialize logger first
const { getModuleContext, initialize } = require('@onelive-dev/x-logger');

const logger = initialize({ context: getModuleContext(module) });

const mongo = require('../app/helpers/mongo');
const olxshipment = require('./../app/models/olxshipment');

module.exports = {
    async up () {
        await mongo.connect();

        logger.info('create olxshipment');
        await olxshipment.create();
    },

    async down () {
        await mongo.connect();

        logger.info('drop olxshipment');
        await olxshipment.drop();
    }
};
