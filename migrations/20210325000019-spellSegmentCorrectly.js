module.exports = {
    async up (db) {
        await db.collection('events').createIndex({ liveSegmentId: 1 });
        await db.collection('events').dropIndex({ liveSegementId: 1 });
    },

    async down (db) {
        await db.collection('events').createIndex({ liveSegementId: 1 });
        await db.collection('events').dropIndex({ liveSegmentId: 1 });
    }
};
