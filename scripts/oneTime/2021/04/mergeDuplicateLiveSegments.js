// initialize logger first
const { getModuleContext, initialize } = require('@onelive-dev/x-logger');

const logger = initialize({ context: getModuleContext(module) });

const mongo = require('../../../../app/helpers/mongo');

async function main () {
    await mongo.connect();
    const liveLanes = mongo.get().db().collection('liveLanes');
    const liveSegments = mongo.get().db().collection('liveSegments');
    const events = mongo.get().db().collection('events');

    const duplicateLiveSegments = liveSegments.aggregate([
        { $group: { _id: { trackingNumber: '$trackingNumber' }, ids: { $addToSet: '$_id' } } },
        { $match: { 'ids.1': { $exists: true } } }
    ], { allowDiskUse: true });

    for await (const duplicates of duplicateLiveSegments) {
        let finalSegment;
        const segmentsToDelete = [];
        const finalEvents = [];

        for (const id of duplicates.ids) {
            if (finalSegment) {
                segmentsToDelete.push(id);
            } else {
                finalSegment = await liveSegments.findOne({ _id: id });
            }

            finalEvents.concat(await events.find({ liveSegmentId: id }).toArray());
        }

        for (const event in finalEvents) {
            await events.updateMany({ _id: event._id }, { $set: { liveSegmentId: finalSegment._id } });
        }

        for (const _id of segmentsToDelete) {
            await liveSegments.deleteOne({ _id });
        }
    }

    const allLiveLanes = liveLanes.find();
    for await (const liveLane of allLiveLanes) {
        const numLiveSegments = await liveSegments.countDocuments({ liveLaneId: liveLane._id });
        if (numLiveSegments === 0) {
            await liveLanes.deleteOne({ _id: liveLane._id });
        }
    }
}

main()
    .then((res) => { process.exit(res); })
    .catch((err) => {
        logger.error('error running script', err);
        process.exit(1);
    });
