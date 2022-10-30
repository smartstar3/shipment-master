const {
    eventSchema20210226,
    liveSegmentSchema20210226
} = require('./20210226224121-createTrackingCollections');

module.exports = {
    async up (db) {
        await db.command({ collMod: 'events', validator: {}, validationLevel: 'off' });
        await db.command({ collMod: 'liveSegments', validator: {}, validationLevel: 'off' });
    },

    async down (db) {
        await db.command({
            collMod: 'events',
            validator: eventSchema20210226,
            validationLevel: 'strict'
        });
        await db.command({
            collMod: 'liveSegments',
            validator: liveSegmentSchema20210226,
            validationLevel: 'strict'
        });
    }
};
