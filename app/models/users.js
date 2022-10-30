// models/user.js -- model for users collection
//
'use strict';
const BasicModel = require('./BasicModel');
const mongo = require('../helpers/mongo');
const objectFunc = require('../helpers/objectFuncs');

// see README, schema is not enforced beyond collection name and index structure
//
const schema = {
    // collection name
    name: 'users',

    // a list docs for collection.createIndex( ...doc )
    index: [[{ email: 1 }, { unique: true }]]
};

// example collection document
//
// {
//     firstname: 'string',
//     lastname: 'string',
//     email: 'string',
//     password: 'string', == Argon2 (or some secure) hash
//     roleId: 'ObjectId', == db _id of role
//     organizationId: 'ObjectId' == db _id of organization
// }
//

class Users extends BasicModel {
    async dbset (urec) {
        this.logger.debug({ message: `models.${this.name}.dbset`, urec: urec });
        const uc = mongo.get().db().collection(this.name);

        const res = await uc.insertOne({
            ...urec,
            roleId: objectFunc.stringIDToDBObjectID(urec.roleId),
            organizationId: objectFunc.stringIDToDBObjectID(urec.organizationId)
        });

        return res.ops[0];
    }

    async dbupdate (urec) {
        this.logger.debug({ message: `models.${this.name}.dbupdate`, urec: urec });
        const { id, ...rest } = urec;
        const uc = mongo.get().db().collection(this.name);
        await uc.updateOne(
            { _id: objectFunc.stringIDToDBObjectID(id) },
            {
                $set:
                    {
                        ...rest,
                        roleId: objectFunc.stringIDToDBObjectID(rest.roleId),
                        organizationId: objectFunc.stringIDToDBObjectID(rest.organizationId)
                    }
            }
        );
        return urec;
    }
}

module.exports = new Users(schema);
