const sourceSchema = {
    bsonType: 'object',
    required: [
        '_id',
        'createdAt',
        'state',
        'uri',
        'data'
    ],
    additionalProperties: false,
    properties: {
        _id: { bsonType: 'objectId' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
        state: {
            bsonType: 'string',
            enum: ['CREATED', 'PROCESSING', 'COMPLETED', 'FAILURE']
        },
        uri: { bsonType: 'string' },
        data: { bsonType: 'object' }
    }
};

const rowSchema = {
    bsonType: 'object',
    required: [
        '_id',
        'createdAt',
        'state',
        'sourceId',
        'rowNumber',
        'data'
    ],
    additionalProperties: false,
    properties: {
        _id: { bsonType: 'objectId' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
        sourceId: { bsonType: 'objectId' },
        state: {
            bsonType: 'string',
            enum: ['CREATED', 'PROCESSING', 'COMPLETED', 'FAILURE']
        },
        rowNumber: { bsonType: 'number' },
        data: { bsonType: 'object' }
    }
};

const eventSchema = {
    bsonType: 'object',
    required: [
        '_id',
        'createdAt',
        'trackingNumber',
        'timestamp',
        'provider',
        'providerStatus',
        'internalStatus',
        'externalStatus',
        'message',
        'liveSegmentId'
    ],
    additionalProperties: false,
    properties: {
        _id: { bsonType: 'objectId' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
        trackingNumber: { bsonType: 'string' },
        timestamp: { bsonType: 'string' },
        provider: {
            bsonType: 'string',
            enum: ['DHLeCommerce', 'LaserShip', 'LSO', 'OnTrac', 'UDS', 'X']
        },
        providerStatus: { bsonType: 'string' },
        internalStatus: {
            bsonType: 'string',
            enum: [
                'Label Created',
                'Label Created: Manifested',
                'In-Transit',
                'In-Transit: Received at Facility',
                'In-Transit: Processing at Facility',
                'In-Transit: Departed Facility',
                'In-Transit: Tendered to carrier',
                'In-Transit: Converted to different service level',
                'In-Transit: Misroute',
                'In-Transit: Meaningless update',
                'Out for Delivery',
                'Attempted',
                'Attempted: Inaccessible',
                'Attempted: Pick-up Required',
                'Attempted: Redelivery Required',
                'Attempted: Additional Information Needed',
                'Attempted: Mailbox Full',
                'Attempted: Signature not available',
                'Attempted: No one home ',
                'Attempted: Business closed',
                'Attempted: Notice Left',
                'Delivered',
                'Delivered: Potential Issue',
                'Delivered: With Neighbor',
                'Delivered: Front desk',
                'Delivered: Backdoor',
                'Delivered: Mailroom',
                'Delivered: Garage',
                'Delivered: Porch',
                'Hold for Pickup',
                'Delayed',
                'Delayed: Weather',
                'Delayed: Mechanical Issues',
                'Delayed: Route Closed',
                'Delayed: Customer Request',
                'Delayed: Delivered at Incorrect Address',
                'Delayed: Holiday/Non-Working Day',
                'Exception: Missing Update',
                'Exception: Change of Address',
                'Exception: Customer Requested New Delivery Date',
                'Exception: Incorrect Status Update',
                'Exception: Partial Delivery',
                'Exception: Package being held',
                'Undeliverable',
                'Undeliverable: Insufficient Address',
                'Undeliverable: Bad Address',
                'Undeliverable: Damaged / Destroyed',
                'Undeliverable: Dangerous Goods',
                'Undeliverable: Package Refused',
                'Undeliverable: Package Lost',
                'Undeliverable: Misc Package Issue',
                'Undeliverable: Location not secure',
                'Undeliverable: Improper Packaging',
                'Return to Sender',
                'Unknown'
            ]
        },
        externalStatus: {
            bsonType: 'string',
            enum: [
                'Label Created',
                'In-Transit',
                'Out for Delivery',
                'Delivery Attempted',
                'Delivered',
                'Hold for Pickup',
                'Delayed',
                'Exception',
                'Undeliverable',
                'Return to Sender',
                'Unknown'
            ]
        },
        message: { bsonType: ['string', 'null'] },
        hidden: { bsonType: ['bool', 'null'] },
        location: {
            bsonType: ['object', 'null'],
            properties: {
                city: { bsonType: ['string', 'null'] },
                state: { bsonType: ['string', 'null'] },
                zip: { bsonType: ['string', 'null'] }
            }
        },
        signature: { bsonType: ['string', 'null'] },
        expectedDeliveryDate: { bsonType: ['string', 'null'] },
        liveSegmentId: { bsonType: ['objectId', 'null'] }
    }
};

const liveSegmentSchema = {
    bsonType: 'object',
    required: [
        '_id',
        'createdAt',
        'provider',
        'trackingNumber',
        'liveLaneId',
        'shipDate',
        'terminal'
    ],
    additionalProperties: false,
    properties: {
        _id: { bsonType: 'objectId' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
        provider: {
            bsonType: 'string',
            enum: ['DHLeCommerce', 'LaserShip', 'LSO', 'OnTrac', 'UDS', 'X']
        },
        trackingNumber: { bsonType: 'string' },
        liveLaneId: { bsonType: ['objectId', 'null'] },
        shipDate: { bsonType: ['date'] },
        terminal: { bsonType: 'bool' }
    }
};

const liveLaneSchema = {
    bsonType: 'object',
    required: [
        '_id',
        'createdAt',
        'nickname',
        'shipDate'
    ],
    additionalProperties: false,
    properties: {
        _id: { bsonType: 'objectId' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
        nickname: { bsonType: 'string' },
        shipDate: { bsonType: ['date'] }
    }
};

module.exports = {
    async up (db) {
        await db.createCollection('events', { validator: { $jsonSchema: eventSchema } });

        await db.createCollection('liveSegments', { validator: { $jsonSchema: liveSegmentSchema } });

        await db.createCollection('liveLanes', { validator: { $jsonSchema: liveLaneSchema } });

        await db.createCollection('sources', { validator: { $jsonSchema: sourceSchema } });
        await db.collection('sources').createIndex({ uri: 1 }, { unique: true });

        await db.createCollection('rows', { validator: { $jsonSchema: rowSchema } });
        await db.collection('rows').createIndex({ sourceId: 1, rowNumber: 1 }, { unique: true });
    },

    async down (db) {
        await db.collection('events').drop();
        await db.collection('liveSegments').drop();
        await db.collection('liveLanes').drop();
        await db.collection('sources').drop();
        await db.collection('rows').drop();
    },

    sourceSchema20210226: sourceSchema,
    rowSchema20210226: rowSchema,
    eventSchema20210226: eventSchema,
    liveSegmentSchema20210226: liveSegmentSchema,
    liveLaneSchema20210226: liveLaneSchema
};
