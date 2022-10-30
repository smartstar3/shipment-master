module.exports = {
    async up (db) {
        db.collection('zipcodes').createIndex({ geolocation: '2dsphere' });
    },

    async down (db) {
        db.collection('zipcodes').dropIndex({ geolocation: '2dsphere' });
    }
};
