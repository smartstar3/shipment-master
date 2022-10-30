// initialize logger first
const { getModuleContext, initialize } = require('@onelive-dev/x-logger');

const logger = initialize({ context: getModuleContext(module) });

const mongo = require('../../../../app/helpers/mongo');

async function main () {
    await mongo.connect();
    const events = mongo.get().db().collection('events');

    const duplicates = await events.aggregate([
        {
            $group: {
                _id: {
                    provider: '$provider',
                    providerStatus: '$providerStatus',
                    timestamp: '$timestamp',
                    trackingNumber: '$trackingNumber'
                },
                count: { $sum: 1 }
            }
        },
        { $match: { count: { $gt: 1 } } }
    ], { allowDiskUse: true }).toArray();

    for (const duplicate of duplicates) {
        await events.deleteOne(duplicate._id);
    }
}

main()
    .then((res) => { process.exit(res); })
    .catch((err) => {
        logger.error('error running script', err);
        process.exit(1);
    });
