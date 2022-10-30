// initialize logger first
const { getModuleContext, initialize } = require('@onelive-dev/x-logger');

const logger = initialize({ context: getModuleContext(module) });

const mongo = require('../../../../app/helpers/mongo');
const scv = require('../../../../app/repositories/scv');

async function main () {
    await mongo.connect();
    const rows = mongo.get().db().collection('rows');
    const sources = mongo.get().db().collection('sources');

    const unfinishedSources = rows.aggregate([
        { $group: { _id: { sourceId: '$sourceId' }, maxRowNumber: { $max: '$rowNumber' } } },
        { $match: { maxRowNumber: 999 } }
    ]);

    for await (const source of unfinishedSources) {
        await sources.updateOne({ _id: source._id.sourceId }, { $set: { state: 'PROCESSING' } });
        await scv.enqueue('processSource', { _id: source._id.sourceId, start: 1000 });
    }
}

main()
    .then((res) => { process.exit(res); })
    .catch((err) => {
        logger.error('error running script', err);
        process.exit(1);
    });
