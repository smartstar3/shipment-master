const mongo = require('../../app/helpers/mongo');

module.exports = {
    setupDatabase: async () => {
        await mongo.connect();
    },

    cleanDatabase: async () => {
        for (const collection of await mongo.get().db().collections()) {
            if (collection.collectionName !== 'changelog') {
                await collection.deleteMany();
            }
        }
    }
};
