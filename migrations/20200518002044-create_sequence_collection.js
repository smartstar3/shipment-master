// migrations/create_sequence -- initial migration to create and seed the sequence collection and the initial set of numbers
//
'use strict';
// initialize logger first
const { getModuleContext, initialize } = require('@onelive-dev/x-logger');

const logger = initialize({ context: getModuleContext(module) });

const mongo = require('../app/helpers/mongo');
const sequence = require('./../app/models/sequence');

const seedData = [
    {
        name: 'OlxTracker',
        start: 0,
        end: Math.pow(32, 5), // 5 base-32 characters
        description: 'XLX:OlxTracker lane sequence number'
    },
    {
        name: 'ShippingLanes',
        start: 0,
        end: Math.pow(32, 2), // 2 base-32 digits
        description: 'unique coded shipping lanes'
    },
    {
        name: 'Shippers',
        start: 0,
        end: Math.pow(32, 3), // 3 base-32 digits
        description: 'unique sequence for organization:shipper id.tostring()'
    }
];

const seqData = {
    ShippingLanes: [
        'Default',
        'Austin TX:LSO',
        'Portland ME:LaserShip',
        'Los Angeles CA:LaserShip',
        'Spanish Fork UT:LaserShip'
    ],
    Shippers: ['None']
};

module.exports = {
    async up () {
        await mongo.connect();

        logger.info('create sequence collection');
        await sequence.create();

        logger.info('create sequence containers');
        for (const seq of seedData) {
            await sequence.newseq(seq);
        }

        for (const [key, value] of Object.entries(seqData)) {
            logger.info('create sequence', { key });
            for (const name in value) {
                await sequence.nextseq(key, name);
            }
        }
    },
    async down () {
        await mongo.connect();

        logger.info('drop sequence');
        await sequence.drop();
    }
};
