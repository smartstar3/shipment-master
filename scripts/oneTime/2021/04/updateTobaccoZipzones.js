// initialize logger first
const { getModuleContext, initialize } = require('@onelive-dev/x-logger');

const logger = initialize({ context: getModuleContext(module) });

const mongo = require('../../../../app/helpers/mongo');

// Adds tobacco true to existing tobacco providers
// Updates lso with it's account number (non vape)

const TOBACCO_CARRIERS = [
    'MERC',
    'HKB',
    'DI',
    'SONIC',
    'PRMD',
    'NXDY',
    'CSL',
    'MERC',
    'QUICK'
];

async function main () {
    await mongo.connect();
    const zipzones = mongo.get().db().collection('zip_zone');

    await zipzones.updateMany({
        carrier: { $in: TOBACCO_CARRIERS }
    }, {
        $set: {
            tobacco: true
        }
    });

    await zipzones.updateMany({
        carrier: 'LSO'
    }, {
        $set: {
            'options.accountNumber': process.env.LSO_ACCOUNTNUM
        }
    });
}

main()
    .then((res) => { process.exit(res); })
    .catch((err) => {
        logger.error('error running script', err);
        process.exit(1);
    });
