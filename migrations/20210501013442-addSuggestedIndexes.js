module.exports = {
    async up (db) {
        db.collection('liveSegments').createIndex({ lane: 1 });
        db.collection('events').createIndex({ 'location.zip': 1 });
        db.collection('events').createIndex({ createdAt: 1 });
        db.collection('rows').createIndex({ message: 1, state: 1 });
    },

    async down (db) {
        db.collection('liveSegments').dropIndex({ lane: 1 });
        db.collection('events').dropIndex({ 'location.zip': 1 });
        db.collection('events').dropIndex({ dropdAt: 1 });
        db.collection('rows').dropIndex({ message: 1, state: 1 });
    }
};
