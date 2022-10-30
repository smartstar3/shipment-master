// initialize logger first
const { getModuleContext, initialize } = require('@onelive-dev/x-logger');

const logger = initialize({ context: getModuleContext(module) });

const { ArgumentParser } = require('argparse');

const mongo = require('../../../../app/helpers/mongo');

const main = async args => {
    await mongo.connect();

    const events = mongo.get().db().collection('events');

    for await (const event of events.find({ signature: /^https/ })) {
        logger.info('moving signature to signatureUrl', { signature: event.signature });
        if (!args.dryRun) {
            await events.updateOne(
                { _id: event._id },
                { $set: { signatureUrl: event.signature, signature: null } }
            );
        }
    }
};

const parser = new ArgumentParser({
    description: 'Migrate event signature urls to signatureUrl where applicable'
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
