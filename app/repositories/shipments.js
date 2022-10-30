const { getLogger } = require('@onelive-dev/x-logger');
const { MongoGateway, createGateway } = require('gateway');

const mongo = require('../helpers/mongo');
const olxshipment = require('../models/olxshipment');
const OlxTracker = require('../models/olxtracker');
const Zipcodes = require('../models/zipcodes');
const { ORDER_STATUS, TRACKING_NUMBER_LOOKUP } = require('../constants/carrierConstants');
const { trackingUrl } = require('../config');

const logger = getLogger(module);

class ShipmentsGateway extends createGateway(MongoGateway, {
    name: 'olxshipment',
    schema: {
        type: 'object',
        required: ['created_date', 'tn', 'shipper', 'label', 'docs'],
        additionalProperties: true,
        properties: {
            _id: {
                type: ['object', 'string'],
                properties: { id: { type: 'object' } }
            },
            created_date: { type: 'date' },
            tn: { type: 'string' },
            shipper: { type: 'number' },
            label: {
                type: 'object',
                required: ['type', 'base64'],
                additionalProperties: false,
                properties: {
                    type: { type: 'string' },
                    base64: { type: 'string' }
                }
            },
            docs: {
                type: 'array',
                items: {
                    type: 'object',
                    required: ['vendor', 'doc'],
                    additionalProperties: true,
                    properties: {
                        vendor: { type: 'string' },
                        doc: {
                            type: 'object',
                            required: ['Label'],
                            additionalProperties: true,
                            properties: {
                                Label: { type: 'string' }
                            }
                        }
                    }
                }
            }
        }
    }
}) {
    async getShipmentByTrackingNumber (trackingNumber, shipper) {
        const forShipper = shipper !== undefined ? { shipper } : {};

        return this.find({
            ...forShipper,
            $or: [
                { tn: trackingNumber },
                ...TRACKING_NUMBER_LOOKUP.map((value) => {
                    return { [value]: trackingNumber };
                })
            ]
        });
    }
}

const buildGatewayMethod = (method) => {
    return async (...args) => {
        const gateway = new ShipmentsGateway({ client: mongo.get() });
        /* eslint-disable-next-line security/detect-object-injection */
        return gateway[method](...args);
    };
};

const getTrackingUrl = (shipment) => new URL(shipment.tn, trackingUrl).href;

const getTerminalProvider = (shipment) => shipment.docs[0].vendor;

const getTerminalTrackingNumber = (shipment = { docs: [] }) => {
    const { docs = [] } = shipment;
    if (!docs.length || !docs[0].doc) {
        return shipment.tn;
    }

    const provider = getTerminalProvider(shipment);
    const providerDocumentation = docs[0].doc;
    if (provider === 'UDS') {
        return providerDocumentation.Barcode;
    } else if (provider === 'LaserShip') {
        return providerDocumentation.Pieces[0].LaserShipBarcode;
    } else if (provider === 'OnTrac') {
        return providerDocumentation.Tracking;
    } else if (providerDocumentation.trackingNumber) {
        return providerDocumentation.trackingNumber;
    } else {
        return shipment.tn;
    }
};

const getShipmentByTrackingNumber = buildGatewayMethod('getShipmentByTrackingNumber');

const getShipmentById = async (id, shipper) => {
    let shipment;
    const forShipper = shipper !== undefined ? { shipper } : {};

    if (id instanceof mongo.ObjectId || (typeof id === 'string' && id.length === 24)) {
        shipment = await olxshipment.dbget({ _id: new mongo.ObjectId(id), ...forShipper });
    }

    if (!shipment) {
        shipment = await getShipmentByTrackingNumber(id, shipper);
    }

    return shipment;
};

const getDestinationTimezone = async (shipment) => {
    const { to_address: toAddress = {} } = shipment;
    let { zip: zipcode } = toAddress;
    if (zipcode) {
        zipcode = zipcode.slice(0, 5); // handle zip+4;
        const result = await Zipcodes.dbget({ zipcode: zipcode });
        return result ? result.timezone : null;
    } else {
        return null;
    }
};

const saveOrderResult = async (org, params, carrierName, orderObject) => {
    const log = logger.child({ method: 'saveOrderResult' });
    log.debug('Entering saveOrderResult', {
        org: org,
        params: params,
        carrierName: carrierName,
        orderObject: orderObject
    });

    const defaultShippingLane = 0;
    const olxtn = await new OlxTracker({
        shipper: org.shipperSeqNum,
        lane: defaultShippingLane
    });
    const base64Label = orderObject.Label;

    const olxship = {
        tn: olxtn.toString(),
        shipper: org.shipperSeqNum,
        status: ORDER_STATUS.tracking,
        label: {
            type: params.label_format,
            base64: base64Label
        },
        tracking: [],
        shipper_name: params.shipper_name,
        shipper_phone: params.shipper_phone,
        reference_id: params.reference_id,
        reference_data: params.reference_data,
        to_address: params.to_address,
        from_address: params.from_address,
        parcel: params.parcel,
        rate: params.rate,
        docs: [
            {
                vendor: carrierName,
                type: 'order',
                doc: orderObject
            }
        ],
        created_date: new Date()
    };

    if (params.controlled_substance) {
        olxship.controlled_substance = params.controlled_substance;
    }

    return olxshipment.dbset(olxship);
};

const updateShipment = async (shipment, update) => {
    return olxshipment.dbupdate({ ...shipment, ...update, updatedAt: new Date() });
};

module.exports = {
    getTrackingUrl,
    getTerminalProvider,
    getTerminalTrackingNumber,
    getShipmentById,
    saveOrderResult,
    updateShipment,
    getDestinationTimezone,
    getShipmentByTrackingNumber
};
