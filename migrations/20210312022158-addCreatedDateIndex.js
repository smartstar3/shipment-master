module.exports = {
    async up (db) {
        db.collection('olxshipment').createIndex({ created_date: 1 });
    },

    async down (db) {
        db.collection('olxshipment').dropIndex({ created_date: 1 });
    }
};
