
const { getModuleContext, initialize } = require('@onelive-dev/x-logger');

const logger = initialize({ context: getModuleContext(module) });

const { ArgumentParser } = require('argparse');

const {
    CARRIER_NAMES: {
        axlehire,
        capitalExpress,
        cSLogistics,
        expeditedDelivery,
        hackbarth,
        deliverIt,
        jet,
        jst,
        laserShip,
        lso,
        mercury,
        michaelsMessengerService,
        nextDayExpress,
        ontrac,
        parcelPrep,
        pillowLogistics,
        promed,
        quickCourier,
        sonic,
        uds,
        veterans,
        zipExpress,
        stat
    }
} = require('../../../../app/constants/carrierConstants');

const mongo = require('../../../../app/helpers/mongo');

const main = async args => {
    await mongo.connect();
    const organizations = mongo.get().db().collection('organizations');
    for await (const org of organizations.find({ terminalProviderOrder: null })) {
        let terminalProviderOrder = [uds, laserShip, parcelPrep];

        if (org.name === 'Turntable Labs') {
            terminalProviderOrder = [laserShip];
        } else if (['BuiltBar', 'PhoneSoap', 'Rocksolid', 'test', 'Easyship', 'Chirp', 'Savvi', 'G2G BAR'].includes(org.name)) {
            terminalProviderOrder = [ontrac, uds, lso, laserShip, parcelPrep];
        /* istanbul ignore if */
        } else if (['CreativeLogistics', 'FashionNova'].includes(org.name)) {
            terminalProviderOrder = [laserShip, lso, axlehire];
        } else if (org.settings?.tobacco) {
            terminalProviderOrder = [
                sonic, lso, deliverIt, promed, nextDayExpress, cSLogistics,
                mercury, quickCourier, jst, capitalExpress, michaelsMessengerService,
                veterans, jet, zipExpress, pillowLogistics, expeditedDelivery, hackbarth, stat];
        }

        logger.info('Adding terminal providers (carriers) to orgs', { org: org.name, carriers: terminalProviderOrder });
        if (!args.dryRun) {
            await organizations.updateOne(
                { _id: org._id },
                { $set: { terminalProviderOrder: terminalProviderOrder } }
            );
        }
    }
};

const parser = new ArgumentParser({
    description: 'Backfill carrier order on existing organizations'
});

parser.add_argument('-d', '--dry-run', {
    dest: 'dryRun',
    action: 'store_true',
    help: 'Print what is going to happen instead of doing anything'
});

main(parser.parse_args())
    .then((res) => { process.exit(res); })
    .catch((err) => {
        logger.error('error running script', err);
        process.exit(1);
    });
