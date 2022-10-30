const Concise = require('concise');
const DHLeCommerce = require('dhl-ecommerce');
const DispatchScience = require('dispatch-science');
const LSO = require('lso');
const UDS = require('uds');
const { CarrierInterfaceRegistry } = require('@onelive-dev/carrier-interfaces');
const { getLogger } = require('@onelive-dev/x-logger');

const DSTracker = require('../../models/olxtracker');
const gconfig = require('../../config');
const LaserShipCarrierInterface = require('./lasershipCarrierInterface');
const OnTracCarrierInterface = require('./onTracCarrierInterface');
const { CARRIER_NAMES } = require('../../constants/carrierConstants');
const { getCredentials } = require('../../repositories/provider');
const { hasProp, getProp, setProp } = require('../../helpers/utils');

const logger = getLogger(module);

// instantiate carrier interfaces
const registryConfig = {
    Axlehire: {
        authToken: gconfig.axlehireAuthToken,
        baseUrl: gconfig.axlehireBaseUrl,
        logger
    },
    ParcelPrep: {
        apiKey: gconfig.parcelPrepApiKey,
        logger
    }
};

const { Axlehire, ParcelPrep } = new CarrierInterfaceRegistry(registryConfig);

const DispatchScienceInterfaces = {};

const concise = new Concise(
    gconfig.conciseClientId,
    gconfig.conciseClientSecret,
    { url: gconfig.conciseURL, logger }
);

const dhlecommerce = new DHLeCommerce(
    gconfig.dhlecommerceURL,
    gconfig.dhlecommerceClientId,
    gconfig.dhlecommerceClientSecret,
    logger
);

const lso = new LSO(
    gconfig.lsoUsername,
    gconfig.lsoPassword,
    { url: gconfig.lsoApiUrl, logger }
);

const uds = new UDS(
    gconfig.udsClientId,
    gconfig.udsClientKey,
    { url: gconfig.udsSOAPUrl, logger }
);

const DispatchScienceCarrier = async (carrier) => {
    const { credentials } = await getCredentials(carrier);
    return new DispatchScience(
        credentials.username,
        credentials.password,
        { logger, url: credentials.url }
    );
};

const DispatchScienceInterface = (carrier) => ({
    createOrder: async (zipZone, params, org) => {
        /* istanbul ignore next */
        if (!hasProp(DispatchScienceInterfaces, carrier)) {
            setProp(DispatchScienceInterfaces, carrier, await DispatchScienceCarrier(carrier));
        }

        // generate tracking number to pass to DS
        const dispatchTrackingNumber = await new DSTracker({
            shipper: org.shipperSeqNum,
            lane: 0,
            header: 'DPS',
            sequenceId: 'DispatchScience'
        });
        return getProp(DispatchScienceInterfaces, carrier).createOrder(zipZone, {
            ...params,
            tn: dispatchTrackingNumber.toString()
        });
    }
});

// Carrier interface array which is matched to carrier name
const carrierInterfaces = {
    [CARRIER_NAMES.axlehire]: Axlehire,
    [CARRIER_NAMES.parcelPrep]: ParcelPrep,
    // @todo port all of these below into carrier-interfaces
    [CARRIER_NAMES.capitalExpress]: concise,
    [CARRIER_NAMES.cSLogistics]: concise,
    [CARRIER_NAMES.deliverIt]: concise,
    [CARRIER_NAMES.dhlecommerce]: dhlecommerce,
    [CARRIER_NAMES.expeditedDelivery]: DispatchScienceInterface(CARRIER_NAMES.expeditedDelivery),
    [CARRIER_NAMES.hackbarth]: concise,
    [CARRIER_NAMES.jet]: concise,
    [CARRIER_NAMES.jst]: concise,
    [CARRIER_NAMES.laserShip]: LaserShipCarrierInterface,
    [CARRIER_NAMES.lso]: lso,
    [CARRIER_NAMES.mercury]: concise,
    [CARRIER_NAMES.michaelsMessengerService]: concise,
    [CARRIER_NAMES.nextDayExpress]: concise,
    [CARRIER_NAMES.ontrac]: OnTracCarrierInterface,
    [CARRIER_NAMES.pillowLogistics]: DispatchScienceInterface(CARRIER_NAMES.pillowLogistics),
    [CARRIER_NAMES.promed]: concise,
    [CARRIER_NAMES.quickCourier]: concise,
    [CARRIER_NAMES.sonic]: concise,
    [CARRIER_NAMES.uds]: uds,
    [CARRIER_NAMES.veterans]: concise,
    [CARRIER_NAMES.zipExpress]: concise,
    [CARRIER_NAMES.stat]: concise
};

module.exports = {
    carrierInterfaces,
    DispatchScienceCarrier,
    DispatchScienceInterface
};
