
const Identities = require('../models/identities');
const mongo = require('../helpers/mongo');

const findOrCreate = async (id, createFields = {}) => {
    const mdb = mongo.get().db().collection(Identities.name);
    const response = await mdb.findOneAndUpdate(
        { oauthId: id },
        { $setOnInsert: { oauthId: id, ...createFields } },
        {
            returnNewDocument: true, // return new doc if one is upserted
            upsert: true
        } // insert the document if it does not exist
    );
    return response;
};

module.exports = {
    findOrCreate
};
