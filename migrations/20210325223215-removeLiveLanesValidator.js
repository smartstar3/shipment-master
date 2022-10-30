const { liveLaneSchema20210226 } = require('./20210226224121-createTrackingCollections');

module.exports = {
    async up (db) {
        await db.command({ collMod: 'liveLanes', validator: {}, validationLevel: 'off' });
    },

    async down (db) {
        await db.command({
            collMod: 'liveLanes',
            validator: liveLaneSchema20210226,
            validationLevel: 'strict'
        });
    }
};
