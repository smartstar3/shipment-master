const { getLogger } = require('@onelive-dev/x-logger');

const logger = getLogger(module);

const UsersRepo = require('../../repositories/graphql/users');

const getUsers = async () => {
    logger.debug('Entering listAccounts');
    const res = await UsersRepo.getUsers();
    logger.debug('listAccounts successful', { res });
    return res;
};

const createUser = async (user) => {
    return await UsersRepo.createUser(user);
};

module.exports = {
    getUsers,
    createUser
};
