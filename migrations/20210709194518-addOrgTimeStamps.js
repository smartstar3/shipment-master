module.exports = {
    async up (db) {
        db.collection('organizations').update({ createdAt: null }, { $set: { createdAt: '2021-07-09T00:00:00.000Z' } });
    },

    async down (db) {
        db.collection('organizations').update({}, { $unset: { createdAt: 1 } });
    }
};
