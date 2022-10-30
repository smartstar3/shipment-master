/* Load a Provider from a CSV.
 *
 * Usage: `node scripts/loadProvider.js /path/to/provider.csv`
 */
// initialize logger first
const { getModuleContext, initialize } = require('@onelive-dev/x-logger');

const logger = initialize({ context: getModuleContext(module) });

const csvtojson = require('csvtojson');
const { ArgumentParser } = require('argparse');

const mongo = require('../app/helpers/mongo');
const Provider = require('../app/repositories/provider');

async function main (args) {
    await mongo.connect();

    await csvtojson({ ignoreEmpty: true })
        .fromFile(args.input)
        .subscribe(async (row) => {
            await Provider.setCredentials(row.provider, row.credentials || {});
        });

    logger.info('Done loading provider');
    return 0;
}

const parser = new ArgumentParser({ description: 'Load provider record from CSV.' });
parser.add_argument('-i', '--input', { required: true, help: 'The path to the input CSV.' });

const args = parser.parse_args();

main(args)
    .then((res) => { process.exit(res); })
    .catch((err) => {
        logger.error('error running script', err);
        process.exit(1);
    });
