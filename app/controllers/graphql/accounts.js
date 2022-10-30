const { getLogger } = require('@onelive-dev/x-logger');

const AccountInterface = require('../../subsystems/accountManagement/accoutManagement');

const logger = getLogger(module);

const listAccounts = async () => {
    logger.debug('Entering listAccounts');
    const res = await AccountInterface.listUsers();
    logger.debug('listAccounts successful', { res });
    return res;
};

const createAccount = async (user) => {
    return await AccountInterface.createUser(user);
};

module.exports = {
    listAccounts,
    createAccount
};
