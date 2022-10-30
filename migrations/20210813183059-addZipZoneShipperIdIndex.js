const { getModuleContext, initialize } = require('@onelive-dev/x-logger');

const logger = initialize({ context: getModuleContext(module) });

module.exports = {
    async up (db) {
        logger.info('create zip_zone shipper_id index');
        await db.collection('zip_zone').createIndex({ shipper_id: 1 });
    },

    async down (db) {
        logger.info('drop zip_zone shipper_id index');
        await db.collection('zip_zone').dropIndex({ shipper_id: 1 });
    }
};
