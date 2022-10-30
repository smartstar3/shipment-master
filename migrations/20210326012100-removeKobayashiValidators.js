const {
    sourceSchema20210226,
    rowSchema20210226
} = require('./20210226224121-createTrackingCollections');

module.exports = {
    async up (db) {
        await db.command({ collMod: 'sources', validator: {}, validationLevel: 'off' });
        await db.command({ collMod: 'rows', validator: {}, validationLevel: 'off' });
    },

    async down (db) {
        await db.command({
            collMod: 'sources',
            validator: sourceSchema20210226,
            validationLevel: 'strict'
        });
        await db.command({
            collMod: 'rows',
            validator: rowSchema20210226,
            validationLevel: 'strict'
        });
    }
};
