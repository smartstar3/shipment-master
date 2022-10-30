// scripts/oneTime/updateShipmentsFields.js
// -- update olxshipments -> add field to_address, from_address, parcel and remove docs[0].req
//

'use strict';
// initialize logger first
const { getModuleContext, initialize } = require('@onelive-dev/x-logger');

const logger = initialize({ context: getModuleContext(module) });

const mongo = require('../../app/helpers/mongo.js');
const olxshipment = require('../../app/models/olxshipment');

logger.info('updateShipmentsFields start');

const updateShipmentsFields = async () => {
    const shipments = await olxshipment.dball();

    for (const shipment of shipments) {
        if (shipment.docs[0].req) {
            shipment.to_address = shipment.docs[0].req.to_address;
            shipment.from_address = shipment.docs[0].req.from_address;
            shipment.parcel = shipment.docs[0].req.parcel;
        }

        delete shipment.docs[0].req;

        await olxshipment.dbreplace(shipment);
    }
};

const main = async () => {
    await mongo.connect();
    await updateShipmentsFields();
    process.exit(0);
};

main();
