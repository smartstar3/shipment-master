// initialize logger first
const { getModuleContext, initialize } = require('@onelive-dev/x-logger');

const logger = initialize({ context: getModuleContext(module) });

const mongo = require('../../../../app/helpers/mongo');
const { CARRIER_NAMES, LASERSHIP_INJECTION_CB } = require('../../../../app/constants/carrierConstants');

// moves uds and lasership zip_zones over to the zip_zone collection

async function main () {
    await mongo.connect();
    const zipzones = mongo.get().db().collection('zip_zone');
    const uds = mongo.get().db().collection('uds_zip_zone');
    const ls = mongo.get().db().collection('lasership_zip_zone');

    const lsCursor = await ls.find();
    while (await lsCursor.hasNext()) {
        const lsDoc = await lsCursor.next();
        await zipzones.insertOne({
            zipcode: lsDoc.zipcode,
            carrier: CARRIER_NAMES.laserShip,
            max_weight: 800,
            options: {
                bestZone: lsDoc.bestZone,
                bestTNT: lsDoc.bestTNT,
                das: lsDoc.das,
                customerBranch: LASERSHIP_INJECTION_CB[lsDoc.bestZone]
            }
        });
    }

    const udsCursor = await uds.find();
    while (await udsCursor.hasNext()) {
        const udsDoc = await udsCursor.next();
        await zipzones.insertOne({
            zipcode: udsDoc.zipcode,
            carrier: CARRIER_NAMES.uds,
            max_weight: 800,
            options: {
                ...udsDoc.injections[0]
            }
        });
    }
}

main()
    .then((res) => { process.exit(res); })
    .catch((err) => {
        logger.error('error running script', err);
        process.exit(1);
    });
