module.exports = {
    async up (db) {
        db.collection('liveSegments').updateMany({}, { $unset: { liveLaneId: true } });
        db.collection('liveLanes').drop();
    },

    async down (db) {
        db.createCollection('liveLanes');
    }
};
