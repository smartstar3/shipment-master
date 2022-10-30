// initialize logger first
const { getModuleContext, initialize } = require('@onelive-dev/x-logger');

const logger = initialize({ context: getModuleContext(module) });

const { ArgumentParser } = require('argparse');

const mongo = require('../app/helpers/mongo');
const scv = require('../app/repositories/scv');

async function main (args) {
    await mongo.connect();
    const collection = mongo.get().db().collection('rows');

    const query = args.query ? JSON.parse(args.query) : {};
    const rows = collection.find({ ...query, state: 'FAILURE' });

    const messages = [];
    for await (const row of rows) {
        await collection.updateOne({ _id: row._id }, {
            $set: { state: 'CREATED' },
            $unset: { message: '' }
        });
        messages.push({ _id: row._id });
    }

    await scv.get().enqueueMany('processRow', messages);
}

const parser = new ArgumentParser({
    description: 'Set state of failed rows to CREATED and enqueue them.'
});
parser.add_argument('-q', '--query', { help: 'A JSON query to use when finding failed rows.' });

main(parser.parse_args())
    .then((res) => { process.exit(res); })
    .catch((err) => {
        logger.error('error running script', err);
        process.exit(1);
    });
