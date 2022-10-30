module.exports = {
    async up (db) {
        await db.collection('sources').dropIndex({ uri: 1 }, { unique: true });
        await db.collection('sources').createIndex({ uri: 1 });
    },

    async down (db) {
        await db.collection('sources').dropIndex({ uri: 1 });
        await db.collection('sources').createIndex({ uri: 1 }, { unique: true });
    }
};
