module.exports = {
    async up (db) {
        await db.collection('events').createIndex({ liveSegementId: 1 });
        await db.collection('liveSegments').createIndex({ liveLaneId: 1, terminal: 1 });

        await db.collection('events').dropIndex({
            provider: 1,
            providerStatus: 1,
            timestamp: 1,
            trackingNumber: 1
        });
        await db.collection('events').createIndex({
            provider: 1,
            providerStatus: 1,
            timestamp: 1,
            trackingNumber: 1
        }, { unique: true });

        await db.collection('olxshipment').createIndex({ cancelledAt: 1 }, { sparse: true });
        await db.collection('olxshipment').createIndex({ shipper: 1 });
        await db.collection('olxshipment').createIndex({ 'docs.vendor': 1 });
    },

    async down (db) {
        await db.collection('events').dropIndex({ liveSegementId: 1 });
        await db.collection('liveSegments').dropIndex({ liveLaneId: 1, terminal: 1 });

        await db.collection('events').dropIndex({
            provider: 1,
            providerStatus: 1,
            timestamp: 1,
            trackingNumber: 1
        }, { unique: true });
        await db.collection('events').createIndex({
            provider: 1,
            providerStatus: 1,
            timestamp: 1,
            trackingNumber: 1
        });

        await db.collection('olxshipment').dropIndex({ cancelledAt: 1 }, { sparse: true });
        await db.collection('olxshipment').dropIndex({ shipper: 1 });
        await db.collection('olxshipment').dropIndex({ 'docs.vendor': 1 });
    }
};
