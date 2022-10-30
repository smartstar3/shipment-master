// initialize logger first
const { getModuleContext, initialize } = require('@onelive-dev/x-logger');

const logger = initialize({ context: getModuleContext(module) });
const mongo = require('../app/helpers/mongo');
const zoneMatrix = require('../app/models/zoneMatrix');

module.exports = {
    async up () {
        await mongo.connect();

        logger.info('create zoneMatrix');
        await zoneMatrix.create();
    },

    async down () {
        await mongo.connect();

        logger.info('drop zoneMatrix');
        await zoneMatrix.drop();
    }
};
