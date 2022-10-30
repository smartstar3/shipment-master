// scripts/oneTime/updateTrackingKeyNamesWithSnakeCase.js
// -- update olxshipments' tracking key which is not snake_case.
//

'use strict';
// initialize logger first
const { getModuleContext, initialize } = require('@onelive-dev/x-logger');

const logger = initialize({ context: getModuleContext(module) });

const _ = require('lodash');
const mongo = require('../../app/helpers/mongo.js');
const olxshipment = require('../../app/models/olxshipment');
const { snakeCase } = require('snake-case');

logger.info('updateTrackingKeyNamesWithSnakeCase start');

const updateTrackingKeyNamesWithSnakeCase = async () => {
    const shipments = await olxshipment.dball();

    for (const shipment of shipments) {
        const _tracking = _.map(shipment.tracking, (item) => {
            return _.mapKeys(item, (value, key) => {
                return snakeCase(key);
            });
        });

        const updatedShipment = {
            ...shipment,
            tracking: _tracking
        };

        await olxshipment.dbreplace(updatedShipment);
    }
};

const main = async () => {
    await mongo.connect();
    await updateTrackingKeyNamesWithSnakeCase();
    process.exit(0);
};

main();
