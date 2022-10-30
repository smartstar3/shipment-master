/*
 * Load the zipcodes collection from a CSV.
 *
 * Usage: `node scripts/loadZipcodes.js -i /path/to/zip_info.csv [-d]`
 */
// initialize logger first
const { getModuleContext, initialize } = require('@onelive-dev/x-logger');

const logger = initialize({ context: getModuleContext(module) });

const csvtojson = require('csvtojson');
const { ArgumentParser } = require('argparse');

const mongo = require('../app/helpers/mongo');
const Zipcodes = require('../app/models/zipcodes');
const { getprop } = require('../app/helper/utils');

const TIME_ZONE_IDS = {
    // in the zipcode file it seems all armed forces zips get timezone code of 0
    // we could potentially use 0 + the "state" value of `AA`, `AE`, `AP` to come up with a default timezone to use
    // 0: '???',
    4: 'America/Port_of_Spain', // 'Atlantic (GMT -04:00)',
    5: 'America/New_York', // 'Eastern (GMT -05:00)',
    6: 'America/Chicago', // 'Central (GMT -06:00)',
    7: 'America/Denver', // 'Mountain (GMT -07:00)',
    8: 'America/Los_Angeles', // 'Pacific (GMT -08:00)',
    9: 'America/Anchorage', // 'Alaska (GMT -09:00)',
    10: 'Pacific/Honolulu', // 'Hawaii-Aleutian Islands (GMT -10:00)',
    11: 'Pacific/Pago_Pago', // 'American Samoa (GMT -11:00)',
    12: 'Pacific/Wake', // 'Wake Island (GMT +12:00)'
    13: 'Pacific/Kwajalein', // 'Marshall Islands (GMT +13:00)'
    14: 'Pacific/Guam', // 'Guam (GMT +10:00)',
    15: 'Pacific/Palau', // 'Palau (GMT +9:00)',
    // Federated States of Micronesia has 2 timezones but USPS zipcode db only has one TimeZone code
    // we are selecting Pacific/Chuuk (GMT +10,00) here as it is most populated island
    // but could also be `Pacific/Kosrae` or `Pacific/Pohnpei` (both GMT +11,00) we could differentiate on city if needed
    16: 'Pacific/Chuuk' // 'Chuuk (GMT +10:00)'
};

async function main (args) {
    const { input, dry_run: dryRun } = args;

    let collection = null;
    let batch = null;

    if (!dryRun) {
        await mongo.connect();
        collection = mongo.get().db().collection(Zipcodes.name);
        batch = collection.initializeUnorderedBulkOp();
    }

    let count = 0;

    await csvtojson({ ignoreEmpty: true })
        .fromFile(input)
        .subscribe(({
            ZipCode,
            City: city,
            State: state,
            Longitude,
            Latitude,
            TimeZone
        }) => {
            const zipcode = ZipCode.padStart(5, '0');
            const lng = Number(Longitude);
            const lat = Number(Latitude);
            const timezone = getprop(TIME_ZONE_IDS, TimeZone);

            // ok to have undefined timezone for code 0 for now
            if (!timezone && TimeZone !== '0') {
                logger.warn('unable to assign timezone', { TimeZone });
            }

            const $set = {
                zipcode,
                city,
                state,
                coordinates: { lng, lat },
                geolocation: {
                    type: 'Point',
                    coordinates: [lng, lat]
                },
                timezone
            };

            if (dryRun) {
                logger.debug('upsert query', $set);
            } else {
                batch
                    .find({ zipcode })
                    .upsert()
                    .updateOne({ $set });
            }

            count++;
        });

    if (!dryRun) {
        logger.info('Executing batch upsert');
        await batch.execute();
        logger.info('Batch upsert complete', { count });
    } else {
        logger.info('Dry run complete', { count });
    }

    return 0;
}

const parser = new ArgumentParser({ description: 'Load zipcodes from CSV.' });
parser.add_argument('-i', '--input', { required: true, help: 'The path to the input CSV.' });
parser.add_argument('-d', '--dry-run', { action: 'store_true', help: 'Enable/Disable dryrun mode' });

const args = parser.parse_args();

main(args)
    .then((res) => { process.exit(res); })
    .catch((err) => {
        logger.error('error running script', err);
        process.exit(1);
    });
