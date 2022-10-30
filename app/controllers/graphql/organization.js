const { getLogger } = require('@onelive-dev/x-logger');

const organizationGQLRepo = require('../../repositories/graphql/organizations');
const organizationRepo = require('../../repositories/organizations');
const { CARRIER_NAMES } = require('../../constants/carrierConstants');
const CARRIER_LIST = Object.values(CARRIER_NAMES);

const logger = getLogger(module);

const getOrganization = async (parent, args) => {
    logger.debug('Entering getOrganization', { parent, args });
    const res = await organizationRepo.getOrganization({ id: args.id });
    logger.debug('getOrganization successful', { res });
    return res;
};

const getOrganizationsByScope = async ({ ids }) => {
    logger.debug('Entering getOrganization', { ids });
    const res = await organizationRepo.getOrganizationsByScope({ ids: ids });
    logger.debug('getOrganization successful', { res });
    return res;
};

const recordConsent = async ({ id, email }) => {
    logger.debug('Entering recordConsent', { id, email });
    const res = await organizationRepo.recordConsent({ id, email });
    logger.debug('recordConsent successful', { res });
    return res;
};

const getOrganizations = async (parent, args) => {
    logger.debug('Entering getOrganizations', { parent, args });
    const res = await organizationRepo.getOrganizations(args);
    logger.debug('getOrganizations successful', { res });
    return res;
};

const getTotalOrganizations = async (parent, args) => {
    logger.debug('Entering getTotalOrganizations', { parent, args });
    const res = await organizationRepo.getTotalOrganizations(args);
    logger.debug('getTotalOrganizations successful', { res });
    return res;
};

const createOrganization = async (parent, args) => {
    logger.debug('Entering createOrganization', { parent, args });
    const res = await organizationRepo.createOrganization(args);
    logger.debug('createOrganization successful', { res });
    return res;
};

const updateOrganization = async (parent, args) => {
    logger.debug('Entering updateOrganization', { parent, args });
    const res = await organizationRepo.updateOrganization(args);
    logger.debug('updateOrganization successful', { res });
    return res;
};

const deleteOrganization = async (parent, args) => {
    logger.debug('Entering deleteOrganization', { parent, args });
    const res = await organizationRepo.deleteOrganization(args);
    logger.debug('deleteOrganization successful', { res });
    return res;
};

const updateOrganizationapiKey = async (parent, args) => {
    logger.debug('Entering updateOrganizationapiKey', { parent, args });
    const res = await organizationRepo.updateApiKey(args);
    logger.debug('updateOrganizationapiKey successful', { res });
    return res;
};

const getApiKey = async (args) => {
    logger.debug('Entering getApiKey', { args });
    const res = await organizationGQLRepo.getApiKey(args);
    logger.debug('getApiKey successful', { res });
    return res;
};

const getOrganizationRates = async (_parent, args) => {
    logger.debug('Entering getOrganizationRates', { args });
    const res = await organizationGQLRepo.getRateCard(args);
    logger.debug('getOrganizationRates successful', { res });
    return res;
};

const getTerminalProviders = async (_parent, args = {}) => {
    logger.debug('Entering terminalProviders', { args });
    if (!args.shipperSeqNum) {
        logger.debug('terminalProviders default return', { CARRIER_LIST });
        return CARRIER_LIST;
    } else {
        const res = await organizationGQLRepo.getTerminalProviders(args);
        const disabledProviders = CARRIER_LIST.filter((carrier) => (!res.includes(carrier)));
        logger.debug('terminalProviders successful', { activeProviders: res, disabledProviders });
        return { activeProviders: res, disabledProviders };
    }
};

module.exports = {
    getOrganization,
    getOrganizations,
    getTotalOrganizations,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    updateOrganizationapiKey,
    getOrganizationsByScope,
    recordConsent,
    getApiKey,
    getOrganizationRates,
    getTerminalProviders
};
