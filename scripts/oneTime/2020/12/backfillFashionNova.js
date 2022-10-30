/* Backfill FashionNova parameters from manifest files extracted from Athena.
 *
 * Usage: `node scripts/oneTime/2020/12/backfillFashionNova.js /path/to/manifests.csv
 */
'use strict';
// initialize logger first
const { getModuleContext, initialize } = require('@onelive-dev/x-logger');

const logger = initialize({ context: getModuleContext(module) });

const csvtojson = require('csvtojson');

const mongo = require('../../../../app/helpers/mongo');
const Shipment = require('../../../../app/models/olxshipment');
const shipmentRepo = require('../../../../app/repositories/shipments');

async function updateShipment (row) {
    const shipment = await shipmentRepo.getShipmentById(row.tracking_number, 5);

    if (shipment && !shipment.to_address) {
        logger.info('Backfilling shipment', { tn: shipment.tn, row });

        const [length, width, height] = row.dimension_lxwxh.split('x');

        await Shipment.dbreplace({
            ...shipment,
            shipper_name: '',
            shipper_phone: '800-866-0286',
            reference_id: `BACKFILLED ${new Date().toDateString()}`,
            reference_data: {
                order_number: row.order_number,
                trailer_number: row.trailer_number !== 'None' ? row.trailer_number : null,
                seal_number: row.seal_number !== 'None' ? row.seal_number : null,
                load_number: row.load_number !== 'None' ? row.load_number : null
            },
            from_address: {
                name: 'Fashion Nova',
                address1: '12588 Florence Ave.',
                address2: '',
                city: 'Santa Fe Springs',
                state: 'CA',
                zip: '90670',
                country: 'US',
                phone: '1-800-866-0286'
            },
            to_address: {
                name: row.ship_to_name,
                address1: row.ship_to_addr1,
                address2: row.ship_to_addr2,
                city: row.ship_to_city,
                zip: row.ship_to_zip,
                country: row.ship_to_country_code,
                phone: ''
            },
            parcel: {
                length: length,
                width: width,
                height: height,
                weight: row.weight_lbs * 16,
                ...shipment.parcel
            }
        });
    } else {
        logger.info('Shipment not found', { row });
    }
}

async function main () {
    await mongo.connect();

    const rows = await csvtojson({ ignoreEmpty: true }).fromFile(process.argv[2]);
    return rows.map((row) => { return updateShipment(row); });
}

main().then(
    (res) => { Promise.all(res).then(process.exit); },
    (err) => {
        logger.error('error running script', err);
        process.exit(1);
    }
);
