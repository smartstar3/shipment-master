// models/roles.js -- model for role collection
//
'use strict';

const BasicModel = require('./BasicModel');
const mongo = require('../helpers/mongo');
const objectFunc = require('../helpers/objectFuncs');

// see README. No schema is enforced beyond name and index structure
const schema = {
    name: 'roles',
    index: [[{ name: 1 }, { unique: true }]] // index name and insure unique
};

// example document structure
//
// {
//     name: 'string',
//     authLevel: 'int' -- authorization level
//     description: 'string'
// }
//

class Roles extends BasicModel {
    constructor (props) {
        super(props);

        // authorization flags
        //
        this.AUTH_USER = 0x01;
        this.AUTH_ADMIN = 0x02;
        this.AUTH_API = 0x04;
    }

    /**
     * dbset() create record for new role
     *
     * @returns {Promise<void>}
     * @param newRole
     */
    async dbset (newRole) {
        this.logger.debug({ message: `Models.${this.name}.dbset`, newRole: newRole });
        const mdb = mongo.get().db();
        if (!newRole.authLevel) newRole.authLevel = this.AUTH_USER; // assume we are creating a user
        const res = await mdb.collection(this.name).insertOne(newRole);
        return res.insertedId;
    }

    // test role name for authorization levels
    // @returns bool
    //
    async isUser (roleId) {
        this.logger.debug({ message: `Models.${this.name}.isUser`, role: roleId });
        const rrec = await this.dbget({ _id: objectFunc.stringIDToDBObjectID(roleId) });
        return !!(rrec.authLevel & this.AUTH_USER);
    }

    async isAdmin (roleId) {
        this.logger.debug({ message: `Models.${this.name}.isUser`, role: roleId });
        const rrec = await this.dbget({ _id: objectFunc.stringIDToDBObjectID(roleId) });
        return !!(rrec.authLevel & this.AUTH_ADMIN);
    }

    // set Authentication level into passed bitfield
    //
    setUser (mask) {
        mask |= this.AUTH_USER;
        return mask;
    }

    setAdmin (mask) {
        mask |= this.AUTH_ADMIN;
        return mask;
    }
}

module.exports = new Roles(schema);
