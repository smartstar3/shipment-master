// repositories/organizations.js -- repository layer for organizations collection
//
const escape = require('regexp.escape');
const mongodb = require('mongodb');
const { getLogger } = require('@onelive-dev/x-logger');

const apiKeyFunc = require('../helpers/apiKeyFuncs');
const mongo = require('../helpers/mongo');
const Organizations = require('./../models/organizations');
const sequence = require('../models/sequence');

const logger = getLogger(module);

const getOrganizations = async (args) => {
    logger.debug('Entering getOrganizations', { args });

    // we go directly to the collection for this query
    const mdb = mongo.get().db().collection(Organizations.name);

    const searchWord = args.searchWord;
    /* eslint-disable-next-line security/detect-non-literal-regexp */
    const searchWordRegExp = new RegExp(escape(searchWord), 'i');

    let orgs = [];
    if (args.start !== undefined && args.count !== undefined) {
        orgs = await mdb.find({
            $or: [
                { name: { $in: [searchWordRegExp] } },
                { contactEmail: { $in: [searchWordRegExp] } }
            ]
        })
            .limit(args.count)
            .skip(args.start)
            .toArray();
    } else {
        orgs = await mdb.find({
            $or: [
                { name: { $in: [searchWordRegExp] } },
                { contactEmail: { $in: [searchWordRegExp] } }
            ]
        }).toArray();
    }

    for (const org of orgs) {
        org.id = org._id; // rename id for app layer
        delete org._id;
    }

    logger.debug('getOrganizations result', { res: orgs });
    return orgs;
};

const getOrganization = async ({ id, _id, ...args }) => {
    logger.debug('Entering getOrganization', { id, _id, args });
    if (id || _id) {
        args._id = new mongo.ObjectId(id || _id);
    }

    const res = await Organizations.dbget(args);

    if (res) {
        res.id = res._id;
        delete res._id;
    }

    logger.debug('getOrganization result', { res });
    return res;
};

const getOrganizationsByScope = async ({ ids = [] }) => {
    logger.debug('Entering getOrganizationsByScope', { ids: ids });

    const res = await Organizations.dbgets({ shipperSeqNum: { $in: ids } });

    logger.debug('getOrganizationsByScope result', { res });

    return res;
};

const recordConsent = async ({ email, id }) => {
    logger.debug('Entering recordConsent', { email, id });

    const db = mongo.get().db().collection(Organizations.name);
    const res = await db.findOneAndUpdate(
        { shipperSeqNum: id },
        {
            $set: {
                consent: {
                    email: email,
                    timestamp: new Date()
                },
                updatedAt: new Date()
            }
        },
        { returnOriginal: false }
    );

    logger.debug('recordConsent result', { res });
    return res?.value;
};

const getOrganizationByApiId = async (apiId) => {
    logger.debug('Entering getOrganizationByApiId', { apiId });
    const res = await Organizations.dbget({ apiId: apiId });
    logger.debug('getOrganizationByApiId result', { res });
    return res;
};

const getTotalOrganizations = async (args) => {
    logger.debug('Entering getTotalOrganizations', { args });

    const searchWord = args.searchWord;
    /* eslint-disable-next-line security/detect-non-literal-regexp */
    const searchWordRegExp = new RegExp(escape(searchWord), 'i');

    const total = await Organizations.dbcount({
        $or: [
            { name: { $in: [searchWordRegExp] } },
            { contactEmail: { $in: [searchWordRegExp] } }
        ]
    });
    logger.debug('getTotalOrganizations result', { res: total });
    return total;
};

const createOrganization = async (args) => {
    logger.debug('Entering createOrganization', { args });

    const apiId = apiKeyFunc.generateApiId();
    const apiKey = apiKeyFunc.generateApiKey();
    const _id = mongodb.ObjectId(); // create the _id for this document
    const shipperSeqNum = await sequence.nextseq('Shippers', _id.toString());
    const res = await Organizations.dbset({
        ...args,
        _id,
        apiId,
        apiKey,
        shipperSeqNum,
        createdAt: args.createdAt || new Date(),
        updatedAt: new Date()
    });
    res.id = res._id;
    delete res._id;

    logger.debug('createOrganization result', { res });
    return res;
};

const updateOrganization = async (args) => {
    logger.debug('Entering updateOrganization', { args });
    const res = await Organizations.dbupdate({ ...args, updatedAt: new Date() });
    logger.debug('updateOrganization result', { res });
    return res;
};

const deleteOrganization = async (args) => {
    logger.debug('Entering deleteOrganization', { args });
    const res = await Organizations.dbdel(args.id);
    logger.debug('deleteOrganization result', { res });
    return res;
};

const updateApiKey = async (args) => {
    logger.debug('Entering updateApiKey', { args });

    const apiKey = apiKeyFunc.generateApiKey();
    await Organizations.dbupdate({ id: args.id, apiKey, updatedAt: new Date() });

    logger.debug('updateApiKey result', { res: apiKey });
    return apiKey;
};

const getOrganizationNames = async (organizationScope = []) => {
    const organizations = mongo.get().db().collection(Organizations.name);
    return organizations.distinct('name', { shipperSeqNum: { $in: [...organizationScope] } });
};

module.exports = {
    getOrganization,
    getOrganizations,
    getTotalOrganizations,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    updateApiKey,
    getOrganizationByApiId,
    getOrganizationNames,
    getOrganizationsByScope,
    recordConsent
};
