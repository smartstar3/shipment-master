// initialize logger first
const { getModuleContext, initialize } = require('@onelive-dev/x-logger');

const logger = initialize({ context: getModuleContext(module) });

const mongo = require('../../../../app/helpers/mongo');

async function main () {
    await mongo.connect();
    const collection = mongo.get().db().collection('liveSegments');

    const liveSegments = collection.find({ terminal: true });
    for await (const liveSegment of liveSegments) {
        if (liveSegment.liveLaneId) {
            const nonTerminalLiveSegments = await collection.find({
                liveLaneId: liveSegment.liveLaneId,
                terminal: false
            });

            const lane = await nonTerminalLiveSegments.map(segment => segment._id).toArray();
            await collection.updateOne({ _id: liveSegment._id }, { $set: { lane: lane } });
        }
    }
}

main()
    .then((res) => { process.exit(res); })
    .catch((err) => {
        logger.error('error running script', err);
        process.exit(1);
    });
