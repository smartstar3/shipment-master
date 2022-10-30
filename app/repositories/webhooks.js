const { MongoGateway, createGateway } = require('gateway');

const mongo = require('../helpers/mongo');
const { getTerminalTrackingNumber } = require('./shipments');
const { present } = require('../presenters/event');

const WebhooksGateway = createGateway(MongoGateway, {
    name: 'webhooks',
    schema: {
        type: 'object',
        required: ['createdAt', 'shipper', 'url'],
        additionalProperties: false,
        properties: {
            _id: {
                type: ['object', 'string'],
                properties: { id: { type: 'object' } }
            },
            createdAt: { type: 'date' },
            updatedAt: { type: ['date', 'null'] },
            shipper: { type: 'number' },
            url: { type: 'string', format: 'uri', pattern: '^https://' }
        }
    }
});

const buildGatewayMethod = (method) => {
    return async (...args) => {
        const gateway = new WebhooksGateway({ client: mongo.get() });
        /* eslint-disable-next-line security/detect-object-injection */
        return gateway[method](...args);
    };
};

const createWebhook = buildGatewayMethod('create');
const findWebhook = buildGatewayMethod('find');
const findWebhooks = buildGatewayMethod('findMany');
const updateWebhook = buildGatewayMethod('update');
const deleteWebhook = buildGatewayMethod('delete');

const buildNotifications = async (event, liveSegment, { shipment } = {}) => {
    const webhooks = await findWebhooks({ shipper: shipment.shipper });
    const payload = await present(event);
    return webhooks.map((webhook) => {
        return {
            requestor: { shipper: shipment.shipper },
            request: {
                url: webhook.url,
                body: {
                    type: 'event',
                    payload: {
                        trackingNumber: shipment.tn,
                        barcode: getTerminalTrackingNumber(shipment),
                        ...payload
                    }
                }
            }
        };
    });
};

module.exports = {
    createWebhook,
    findWebhook,
    findWebhooks,
    updateWebhook,
    deleteWebhook,
    buildNotifications
};
