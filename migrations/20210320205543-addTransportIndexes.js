module.exports = {
    async up (db) {
        await db.collection('events').createIndex({
            provider: 1,
            providerStatus: 1,
            timestamp: 1,
            trackingNumber: 1
        });
        await db.collection('liveSegments').createIndex({ trackingNumber: 1, terminal: 1 });
    },

    async down (db) {
        await db.collection('events').dropIndex({
            provider: 1,
            providerStatus: 1,
            timestamp: 1,
            trackingNumber: 1
        });
        await db.collection('liveSegments').dropIndex({ trackingNumber: 1, terminal: 1 });
    }
};
