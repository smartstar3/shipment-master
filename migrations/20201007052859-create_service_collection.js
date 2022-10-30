// initialize logger first
const { getModuleContext, initialize } = require('@onelive-dev/x-logger');

const logger = initialize({ context: getModuleContext(module) });

const mongo = require('../app/helpers/mongo');
const services = require('./../app/models/services');

module.exports = {
    async up () {
        await mongo.connect();

        logger.info('create services');
        await services.create();
    },

    async down () {
        await mongo.connect();

        logger.info('drop services');
        await services.drop();
    }
};
