module.exports = {
    async up (db) {
        db.collection('liveSegments').dropIndex({ liveLaneId: 1, terminal: 1 });
    },

    async down (db) {
        db.collection('liveSegments').createIndex({ liveLaneId: 1, terminal: 1 });
    }
};
