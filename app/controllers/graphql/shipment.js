const { getLogger } = require('@onelive-dev/x-logger');

const organizationRepo = require('../../repositories/organizations');
const shipmentRepo = require('../../repositories/graphql/shipments');

const adminShipmentsPresenter = require('../../presenters/admin/shipments');
const User = require('../../models/users');
const userShipmentsPresenter = require('../../presenters/user/shipments');
const { STATUSES } = require('../../constants/trackingConstants');
const { stringIDToDBObjectID } = require('../../helpers/objectFuncs');

const logger = getLogger(module);

/**
 *
 * @param args
 * @returns {Promise<*>}
 */
const getShipmentsByAdmin = async (args) => {
    const log = logger.child({ method: 'getShipmentsByAdmin' });
    log.debug('Entering getShipmentsByAdmin', { args });

    let originalCount;
    if (args.count) {
        originalCount = parseInt(args.count);
    }

    const shipmentArgs = { ...args, appendEvents: true };
    if (originalCount) {
        shipmentArgs.count = originalCount + 1;
    }

    const shipmentArr = await shipmentRepo.getShipments(shipmentArgs);

    const res = await adminShipmentsPresenter.present(shipmentArr);

    const paginated = { shipments: res.slice(0, originalCount), hasMore: (res.length > originalCount) };

    log.debug('getShipmentsByAdmin result', { res: paginated });
    return paginated;
};

/**
 *
 * @param args
 * @param context
 * @returns {Promise<array>}
 */
const getShipmentsByUser = async (args, context) => {
    const log = logger.child({ method: 'getShipmentsByUser' });
    log.debug('Entering getShipmentsByUser', { args, context });

    if (context.user) {
        let shipmentArr = [];
        const user = await User.dbget({ _id: stringIDToDBObjectID(context.user._id) });
        shipmentArr = await shipmentRepo.getShipments({ ...args, organizationId: user.organizationId, appendEvents: true });

        const res = await userShipmentsPresenter.present(shipmentArr);
        log.debug('getShipmentsByUser result', { res });

        return res;
    }

    log.debug('getShipmentsByUser - user not found');
    return [];
};

/**
 *
 * @param args
 * @param context
 * @returns {Promise<*>}
 */
const getTotalShipmentCountByUser = async (args, context) => {
    const log = logger.child({ method: 'getTotalShipmentCountByUser' });
    log.debug('Entering getTotalShipmentCountByUser', { args, context });

    const user = await User.dbget({ _id: stringIDToDBObjectID(context.user._id) });
    const res = await shipmentRepo.getTotalShipmentCount({ ...args, organizationId: user.organizationId });

    log.debug('getTotalShipmentCountByUser result', { res });
    return res;
};

const getShipmentByTrackingNumber = async (args) => {
    const log = logger.child({ method: 'getShipmentByTrackingNumber' });
    log.debug('Entering getShipmentByTrackingNumber', { args });

    const shipment = await shipmentRepo.getShipmentByTrackingNumber(args.trackingNum, args.organizationScope, true);
    if (shipment) {
        shipment.vendor = shipment.docs[0].vendor;
        const res = await adminShipmentsPresenter.present([shipment]);

        log.debug('getShipmentByTrackingNumber result', { res });
        return res[0];
    }

    log.debug('getShipmentByTrackingNumber - shipment not found');
    return null;
};

const getShipmentFilters = async (args) => {
    const log = logger.child({ method: 'getShipmentFilters' });
    log.debug('Entering getShipmentFilters', { args });
    const vendors = await shipmentRepo.getShipmentVendors(args.organizationScope);
    const organizations = await organizationRepo.getOrganizationNames(args.organizationScope);

    return {
        carriers: vendors,
        organizations: organizations,
        status: Object.values(STATUSES)
    };
};

module.exports = {
    getShipmentByTrackingNumber,
    getShipmentsByAdmin,
    getShipmentsByUser,
    getTotalShipmentCountByUser,
    getShipmentFilters
};
