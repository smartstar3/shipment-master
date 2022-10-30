const { getLogger } = require('@onelive-dev/x-logger');
const logger = getLogger(module);

const mongo = require('../../helpers/mongo');
const Organizations = require('../../models/organizations');

const AccountInterface = require('../../subsystems/accountManagement/accountManagement');

const formatUsers = async (organizations, users) => {
    const orgMap = {};
    organizations.forEach(({ shipperSeqNum, ...rest }) => {
        Object.assign(orgMap, { [shipperSeqNum]: { ...rest, shipperSeqNum } });
    });

    return users.map(({
        email,
        email_verified: emailVerified,
        family_name: familyName,
        given_name: givenName,
        name,
        nickname,
        user_id: id,
        logins_count: loginsCount,
        last_login: lastLogin,
        app_metadata: appMetadata
    }) => {
        const shipperSeqNum = appMetadata?.organization_id ? appMetadata.organization_id[0] : null;
        return {
            emailVerified,
            email,
            familyName,
            givenName,
            name,
            nickname,
            id,
            loginsCount,
            lastLogin,
            shipperSeqNum: shipperSeqNum || null,
            organization: shipperSeqNum ? orgMap[shipperSeqNum] : null
        };
    });
};

const getUsers = async () => {
    logger.debug('Entering getUsers repo');
    const res = await AccountInterface.listUsers();
    const mdb = mongo.get().db().collection(Organizations.name);
    const organizations = await mdb.find().toArray();
    logger.debug('getUsers repo successful', { res });
    return formatUsers(organizations, res);
};

const createUser = async (user) => {
    logger.debug('Entering createUser repo');
    const res = await AccountInterface.createUser(user);
    logger.debug('createUser repo successful', { res });
    return res;
};

module.exports = {
    getUsers,
    createUser,
    formatUsers
};
