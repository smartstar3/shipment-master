const { AccountManagement } = require('account-management');
const { getLogger } = require('@onelive-dev/x-logger');
const logger = getLogger(module);

const { auth0: { domain, client_id: clientId, client_secret: clientSecret } } = require('../../config/index');

const AccountInterface = new AccountManagement({
    logger: logger,
    clientId,
    clientSecret,
    baseUrl: domain.substring(0, domain.length - 1)
});

const listUsers = async () => {
    return await AccountInterface.listUsers();
};

const createUser = async (user) => {
    return await AccountInterface.createUser(user);
};

module.exports = {
    listUsers,
    createUser
};
