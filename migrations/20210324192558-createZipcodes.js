// initialize logger first
const { getModuleContext, initialize } = require('@onelive-dev/x-logger');

const logger = initialize({ context: getModuleContext(module) });

const mongo = require('../app/helpers/mongo');
const zipcodes = require('../app/models/zipcodes');

module.exports = {
    async up () {
        logger.info('create collection');
        await mongo.connect();

        logger.info('create zipcodes');
        await zipcodes.create();
    },

    async down () {
        await mongo.connect();

        logger.info('drop zipcodes');
        await zipcodes.drop();
    }
};
