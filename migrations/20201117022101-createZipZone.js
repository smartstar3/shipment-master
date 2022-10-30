// initialize logger first
const { getModuleContext, initialize } = require('@onelive-dev/x-logger');

const logger = initialize({ context: getModuleContext(module) });

const mongo = require('../app/helpers/mongo');
const zipZone = require('../app/models/zipZones');

module.exports = {
    async up () {
        await mongo.connect();

        logger.info('create zipZone');
        await zipZone.create();
    },

    async down () {
        await mongo.connect();

        logger.info('drop zipZone');
        await zipZone.drop();
    }
};
