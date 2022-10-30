/* Load the zip_zone collection from a CSV.
 *
 * Usage: `node scripts/loadZipZones.js /path/to/zip_zones.csv`
 */// initialize logger first
const { getModuleContext, initialize } = require('@onelive-dev/x-logger');

const logger = initialize({ context: getModuleContext(module) });

const csvtojson = require('csvtojson');
const { ArgumentParser } = require('argparse');

const mongo = require('../../../../app/helpers/mongo');
const ZipZone = require('../../../../app/models/zipZones');
const { CARRIER_NAMES } = require('../../../../app/constants/carrierConstants');
const { getprop } = require('../../../../app/helper/utils');

const LASERSHIP_INJECTION_CB = {
    CHAR: 'ONELICHR',
    ORLA: 'ONELIORL',
    SBSC: 'ONELIVNP',
    URBOH: 'ONELIURB'
};

async function main (args) {
    await mongo.connect();
    const collection = mongo.get().db().collection(ZipZone.name);
    const batch = collection.initializeUnorderedBulkOp();
    let count = 0;

    await csvtojson({ ignoreEmpty: true })
        .fromFile(args.input)
        .subscribe(({ zip: zipcode, injection }) => {
            const lsZipZone = {
                zipcode: zipcode,
                carrier: CARRIER_NAMES.laserShip,
                max_weight: 800,
                options: {
                    bestZone: injection,
                    bestTNT: injection,
                    das: null,
                    customerBranch: getprop(LASERSHIP_INJECTION_CB, injection)
                }
            };

            if (args.dryRun) {
                logger.info('zipcode', { zipcode });
            } else {
                batch.insert(lsZipZone);
            }
            count++;
        });

    await batch.execute();
    logger.info(`Done expanding ${count} lasership zipzones`);
    return 0;
}

const parser = new ArgumentParser({ description: 'Load lasership expansion  from CSV.' });
parser.add_argument('-i', '--input', { required: true, help: 'The path to the input CSV.' });
parser.add_argument('-d', '--dry-run', { help: 'Enable/Disable dryrun mode' });

const args = parser.parse_args();

main(args)
    .then((res) => { process.exit(res); })
    .catch((err) => {
        logger.error('error running script', err);
        process.exit(1);
    });
