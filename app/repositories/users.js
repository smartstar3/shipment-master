// repositories/users.js -- application-level data store for Users
//
'use strict';
const argon2 = require('argon2');
const escape = require('regexp.escape');

const { getLogger } = require('@onelive-dev/x-logger');

const mongo = require('../helpers/mongo');
const objectFunc = require('../helpers/objectFuncs');
const Organizations = require('./../models/organizations');
const Roles = require('./../models/roles');
const Users = require('./../models/users');

const logger = getLogger(module);

const getUsers = async (args) => {
    logger.debug('Entering getUsers', { args });

    // we go directly to the collection for this query
    const users = mongo.get().db().collection(Users.name);
    const searchWord = args.searchWord;
    /* eslint-disable-next-line security/detect-non-literal-regexp */
    const searchWordRegExp = new RegExp(escape(searchWord), 'i');

    const aggregationPipeline = [
        {
            $project: {
                name: { $concat: ['$firstname', ' ', '$lastname'] },
                _id: 1,
                email: 1,
                roleId: 1,
                organizationId: 1,
                firstname: 1,
                lastname: 1
            }
        },
        {
            $match: {
                $or: [
                    { name: { $in: [searchWordRegExp] } },
                    { email: { $in: [searchWordRegExp] } }
                ]
            }
        },
        {
            $lookup: {
                from: Organizations.name,
                localField: 'organizationId',
                foreignField: '_id',
                as: 'organization'
            }
        },
        {
            $lookup: {
                from: Roles.name,
                localField: 'roleId',
                foreignField: '_id',
                as: 'role'
            }
        },
        {
            $addFields: {
                organizationName: { $arrayElemAt: ['$organization.name', 0] },
                roleName: { $arrayElemAt: ['$role.name', 0] }
            }
        }
    ];

    if (args.organizationId !== '') {
        aggregationPipeline.push({
            $match: { organizationId: objectFunc.stringIDToDBObjectID(args.organizationId) }
        });
    }

    if (args.roleId !== '') {
        aggregationPipeline.push({
            $match: { roleId: objectFunc.stringIDToDBObjectID(args.roleId) }
        });
    }

    if (args.sorting && args.sorting.field !== '') {
        aggregationPipeline.push({
            $sort: { [args.sorting.field]: args.sorting.order }
        });
    }

    if (args.start !== undefined && args.count !== undefined) {
        aggregationPipeline.push(
            {
                $skip: args.start
            },
            {
                $limit: args.count
            }
        );
    }

    const result = await users.aggregate(aggregationPipeline).toArray();

    for (const user of result) {
        user.id = user._id; // rename id for app layer
        delete user._id;

        user.organization = { ...user.organization[0] };
        user.organization.id = user.organization._id;
        delete user.organization._id;

        user.role = { ...user.role[0] };
        user.role.id = user.role._id;
        delete user.role._id;
        delete user.role.authLevel;
        delete user.role.description;
    }

    logger.debug('getUsers response', { result });

    return result;
};

const getUserWithOrganization = async (userId) => {
    logger.debug('Entering getUserWithOrganization', { userId });

    const userCollection = mongo.get().db().collection(Users.name);
    const users = await userCollection.aggregate([
        {
            $match: { _id: objectFunc.stringIDToDBObjectID(userId) }
        },
        {
            $lookup: {
                from: Organizations.name,
                localField: 'organizationId',
                foreignField: '_id',
                as: 'organizations'
            }
        }
    ]).toArray();

    if (users.length) return users[0];

    return null;
};

const getTotalUsers = async (args) => {
    logger.debug('Entering getTotalUsers', { args });

    const result = await getUsers(args);
    logger.debug('getTotalUsers result', { length: result.length });
    return result.length;
};

const createUser = async (args) => {
    logger.debug('Entering createUser', { args });

    const { firstname, lastname, password, email, roleId, organizationId } = args;
    const pwHash = await argon2.hash(password);
    const createdUser = await Users.dbset({ firstname, lastname, email, roleId, password: pwHash, organizationId });
    Reflect.deleteProperty(createdUser, 'password');

    createdUser.id = createdUser._id;
    delete createdUser._id;

    const organizationAndRole = await getRoleAndOrganization(roleId, organizationId);

    const res = {
        ...createdUser,
        ...organizationAndRole
    };

    logger.debug('getTotalUsers result', { res });

    return res;
};

const updateUser = async (args) => {
    logger.debug('Entering updateUser', { args });

    const { id, firstname, lastname, roleId, email, organizationId } = args;
    const updatedUser = await Users.dbupdate({ id, firstname, lastname, roleId, email, organizationId });

    Reflect.deleteProperty(updatedUser, 'password');

    const organizationAndRole = await getRoleAndOrganization(roleId, organizationId);

    const res = {
        ...updatedUser,
        ...organizationAndRole
    };

    logger.debug('updateUser result', { res });

    return res;
};

const deleteUser = async (args) => {
    logger.debug('Entering deleteUser', { args });

    const res = await Users.dbdel(args.id);
    logger.debug('deleteUser result', { res });
    return res;
};

const resetUserPassword = async (args) => {
    logger.debug('Entering resetUserPassword', { args });
    const user = await Users.dbget({ _id: objectFunc.stringIDToDBObjectID(args.id) });

    if (await argon2.verify(user.password, args.oldPassword)) {
        const pwHash = await argon2.hash(args.newPassword);
        await Users.dbupdate({
            id: objectFunc.stringIDToDBObjectID(args.id),
            password: pwHash,
            roleId: user.roleId,
            organizationId: user.organizationId
        });
    } else {
        throw new Error('Password did not match.');
    }
    logger.debug('deleteUser result', { res: 'success' });

    return 'Password reset successfully.';
};

// fetch array of role objects {ID and name}
//
const getRoles = async () => {
    logger.debug('Entering getRoles');
    const rrs = await Roles.dbgets({}); // get all role records
    const rList = [];
    rrs.forEach(rr => rList.push({ id: rr._id, name: rr.name }));
    logger.debug('deleteUser getRoles', { res: rList });
    return rList;
};

const getRoleAndOrganization = async (roleId, organizationId) => {
    logger.debug('Entering getRoleAndOrganization', { roleId, organizationId });

    const organization = await Organizations.dbget({ _id: objectFunc.stringIDToDBObjectID(organizationId) });
    organization.id = organization._id;
    delete organization._id;

    const role = await Roles.dbget({ _id: objectFunc.stringIDToDBObjectID(roleId) });
    Reflect.deleteProperty(role, 'authLevel');
    Reflect.deleteProperty(role, 'description');
    role.id = role._id;
    delete role._id;

    const res = {
        organization,
        role
    };

    logger.debug('getRoleAndOrganization result', { res });

    return res;
};

module.exports = {
    getUserWithOrganization,
    getUsers,
    getTotalUsers,
    createUser,
    updateUser,
    deleteUser,
    resetUserPassword,
    getRoles
};
