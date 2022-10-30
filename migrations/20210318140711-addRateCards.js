// initialize logger first
const { getModuleContext, initialize } = require('@onelive-dev/x-logger');

const logger = initialize({ context: getModuleContext(module) });

const mongo = require('../app/helpers/mongo');
const rateCards = require('../app/models/rateCards');

module.exports = {
    async up () {
        await mongo.connect();

        logger.info('create rateCards');
        await rateCards.create();
    },

    async down () {
        await mongo.connect();

        logger.info('drop rateCards');
        await rateCards.drop();
    }
};
