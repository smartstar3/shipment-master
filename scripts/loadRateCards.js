/* Load the rate card collection from a CSV.
 *
 * Usage: `node scripts/loadRateCards.js`;
 */
// initialize logger first
const { getModuleContext, initialize } = require('@onelive-dev/x-logger');

const logger = initialize({ context: getModuleContext(module) });

const csvtojson = require('csvtojson');
const { ArgumentParser } = require('argparse');

const mongo = require('../app/helpers/mongo');
const rateCards = require('../app/models/rateCards');

async function main (args) {
    await mongo.connect();
    const collection = mongo.get().db().collection(rateCards.name);
    const batch = collection.initializeUnorderedBulkOp();

    await csvtojson({ ignoreEmpty: true })
        .fromFile(args.input)
        .subscribe((row) => {
            const weight = parseInt(row.weight) * 16;
            const cost = parseFloat(row.cost);
            const effectiveAt = row.effectiveAt ? new Date(row.effectiveAt) : new Date();
            const expiresAt = row.expiresAt ? new Date(row.expiresAt) : null;

            if (!weight || !cost) {
                throw new Error(
                    `weight ("${row.weight}") and cost ("${row.cost}") are required on each row`
                );
            }

            if (isNaN(effectiveAt) || isNaN(expiresAt)) {
                throw new Error(
                    `effectiveAt ("${row.effectiveAt}") and expiresAt ("${row.expiresAt}") must be ISO compliant strings`
                );
            }

            const card = { weight, cost, expiresAt, effectiveAt, shipperId: args.shipper };

            if (args.flat) {
                for (let zone = 1; zone <= 8; zone++) {
                    batch.insert({ ...card, zone });
                }
            } else {
                const zone = row.zone ? parseInt(row.zone) : null;
                if (!zone) {
                    throw new Error('zone is required on each row for zoned rates');
                }

                batch.insert({ ...card, zone });
            }
        });

    await batch.execute();
    logger.info('Done uploading rate cards');
    return 0;
}

const parser = new ArgumentParser({ description: 'Load rate card from csv' });
parser.add_argument('-i', '--input', { required: true, help: 'The path to the input CSV.' });
parser.add_argument('-s', '--shipper', {
    default: null,
    type: 'int',
    help: 'the shipperId of the customer that these rates apply'
});
parser.add_argument('-f', '--flat', {
    action: 'store_true',
    help: 'true if the rate card is zoneless (flat rate)'
});

const args = parser.parse_args();

main(args)
    .then((res) => { process.exit(res); })
    .catch((err) => {
        logger.error('error running script', err);
        process.exit(1);
    });
