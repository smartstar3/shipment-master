const { ValidationError } = require('joi');

const { CarrierInterface } = require('@onelive-dev/carrier-interfaces');
const { getLogger } = require('@onelive-dev/x-logger');
const { UnprocessableEntityError, NotFoundError } = require('errors');

const getOrderValidator = require('../../validation/external/rest/orderValidator');
const orderPresenter = require('../../presenters/order');
const rulesEngine = require('../../subsystems/rulesEngine/targetZip');
const scv = require('../../repositories/scv');
const transport = require('../../repositories/transport');
const {
    saveOrderResult,
    getShipmentById,
    getShipmentByTrackingNumber,
    getTerminalProvider,
    getTerminalTrackingNumber,
    updateShipment
} = require('../../repositories/shipments');
const { carrierInterfaces } = require('../../subsystems/carriers');
const { DELIVERY_CONFIRMATION_TYPE } = require('../../constants/olxConstants');
const { forceTobaccoShipments } = require('../../config');
const { getRateValue } = require('../../services/rate');
const { ORDER_STATUS } = require('../../constants/carrierConstants');

const logger = getLogger(module);

/*
Order functions and middleware to validate all the parts of the order payload
-- Separate function because this payload is also used for rates
*/

const STATUS_ERROR_MESSAGES = Object.freeze({
    cancelled: 'order already marked as cancelled',
    delivered: 'order already delivered'
});

const defaultOrderPresenter = (data) => {
    return orderPresenter.present(data);
};

const validatedOrderPresenter = (data) => {
    const validator = getOrderValidator({ response: true });
    const presented = orderPresenter.present(data);
    return validator(presented);
};

const normalizeRequest = (org, body) => {
    /* istanbul ignore next */
    const { parcel = {} } = body;
    let controlledSubstance = parcel?.attributes?.substance;
    const tobaccoOrg = org?.settings?.tobacco ?? false;

    if (!controlledSubstance && forceTobaccoShipments && tobaccoOrg) {
        controlledSubstance = 'tobacco';
    }

    if (controlledSubstance) {
        parcel.attributes = {
            ...parcel.attributes,
            substance: controlledSubstance,
            delivery_confirmation: DELIVERY_CONFIRMATION_TYPE.signatureRequiredBy21
        };
        body.parcel = parcel;
    }

    return body;
};

const getValidationOpts = (org, body) => {
    const businessRecipient = body?.to_address?.business ?? false;
    const controlledSubstance = body?.parcel?.attributes?.substance;
    const tobaccoShipToBusiness = org?.settings?.tobaccoShipToBusiness ?? false;

    if (
        businessRecipient &&
        controlledSubstance === 'tobacco' &&
        !tobaccoShipToBusiness
    ) {
        throw new UnprocessableEntityError({
            errors: [{
                name: 'to_address.business',
                message: 'the shipper has not been configured for tobacco shipments to business addresses'
            }]
        });
    }

    return {
        businessRecipient,
        controlledSubstance
    };
};

const validateOrder = (org, body) => {
    normalizeRequest(org, body);
    const validatorOpts = getValidationOpts(org, body);
    const validator = getOrderValidator(validatorOpts);

    try {
        return validator(body);
    } catch (err) {
        /* istanbul ignore else */
        if (err instanceof ValidationError) {
            throw UnprocessableEntityError.fromCelebrateError(err);
        }
        /* istanbul ignore next */
        throw err;
    }
};

const validateOrderMiddleware = async (req, res, next) => {
    const log = logger.child({ method: 'validateOrderMiddleware' });
    log.debug('Entering validateOrderMiddleware');

    const { body, org } = req;
    req.body = validateOrder(org, body);
    next();
};

const createOrder = async (org, body, presenter = validatedOrderPresenter) => {
    const log = logger.child({ method: 'createOrder' });
    log.debug('Entering createOrder');

    const zipZone = await rulesEngine(org, body);
    log.debug('zipZone', { org, zipZone });

    if (!zipZone) {
        throw new UnprocessableEntityError({
            errors: [{
                name: 'zip_code',
                message: `Zipcode ${body.to_address.zip} is not eligible`
            }]
        });
    }

    // @todo simplify this section once all interfaces migrated to CarrierInterface
    const carrierInterface = carrierInterfaces[zipZone.carrier];
    const args = carrierInterface instanceof CarrierInterface
        ? [{ params: body, zipZone }]
        : [zipZone, body, org];

    const orderRes = await carrierInterface.createOrder(...args);

    log.debug('Carrier order response', orderRes);

    body.rate = await getRateValue(org, body);
    const shipment = await saveOrderResult(org, body, zipZone.carrier, orderRes);

    const event = await transport.getClient().buildCreatedEvent({
        trackingNumber: getTerminalTrackingNumber(shipment),
        terminalProvider: getTerminalProvider(shipment),
        createdAt: shipment.created_date,
        location: {
            city: shipment.from_address?.city,
            state: shipment.from_address?.state,
            zip: shipment.from_address?.zip
        }
    });
    await scv.get().enqueue('determineNotifications', { _id: event._id });

    const result = presenter(shipment);

    log.debug('createOrder result', result);

    return result;
};

const createOrderMiddleware = async (req, res) => {
    const log = logger.child({ method: 'createOrderMiddleware' });
    log.debug('Entering createOrderMiddleware');

    const { body, org } = req;

    const created = await createOrder(org, body);
    res.status(201).send(created);
};

const cancelOrder = async (org, id, presenter = defaultOrderPresenter) => {
    const log = logger.child({ method: 'cancelOrder' });
    log.debug('Entering cancelOrder');

    const shipment = await getShipmentByTrackingNumber(id, org.shipperSeqNum);

    if (!shipment) {
        throw new NotFoundError();
    }

    if (shipment.status === ORDER_STATUS.cancelled) {
        throw new UnprocessableEntityError({
            errors: [{
                name: 'order.status',
                message: STATUS_ERROR_MESSAGES.cancelled
            }]
        });
    }

    if (shipment.status === ORDER_STATUS.delivered) {
        throw new UnprocessableEntityError({
            errors: [{
                name: 'order.status',
                message: STATUS_ERROR_MESSAGES.delivered
            }]
        });
    }

    const cancelled = await updateShipment(shipment, {
        status: ORDER_STATUS.cancelled,
        cancelledAt: new Date()
    });

    return presenter(cancelled);
};

const cancelOrderMiddleware = async (req, res) => {
    const log = logger.child({ method: 'cancelOrderMiddleware' });
    log.debug('Entering cancelOrderMiddleware');

    const { id } = req.params;
    const org = req.org;

    const cancelled = await cancelOrder(org, id);
    res.status(200).send(cancelled);
};

const getOrder = async (org, id, presenter = defaultOrderPresenter) => {
    const log = logger.child({ method: 'getOrder' });
    log.debug('Entering getOrder');

    const shipperSeqNum = org?.shipperSeqNum;
    const shipment = await getShipmentById(id, shipperSeqNum);

    if (!shipment) {
        throw new NotFoundError();
    }

    return presenter(shipment);
};

const getOrderMiddleware = async (req, res) => {
    const log = logger.child({ method: 'getOrderMiddleware' });
    log.debug('Entering getOrderMiddleware');

    const { id } = req.params;
    const org = req.org;
    const shipment = await getOrder(org, id);

    return res.status(200).send(shipment);
};

module.exports = {
    createOrder,
    createOrderMiddleware,
    cancelOrder,
    cancelOrderMiddleware,
    getOrder,
    getOrderMiddleware,
    STATUS_ERROR_MESSAGES,
    validateOrder,
    validateOrderMiddleware
};
