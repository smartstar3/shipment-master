const { AbstractProcessSourceRunner, AbstractProcessRowRunner } = require('kobayashi');
const { ObjectId } = require('mongodb');
const { Runner } = require('scv');

const gconfig = require('../../config');
const hermod = require('../hermod');
const transport = require('../transport');

class ProcessSourceRunner extends AbstractProcessSourceRunner {
    static url = `${gconfig.sqsUrlPrefix}-processSource.fifo`
}

class ProcessRowRunner extends AbstractProcessRowRunner {
    static url = `${gconfig.sqsUrlPrefix}-processRow.fifo`

    async run (message, { row, source, worker }) {
        const event = await transport.getClient().ingestRow(row, source);

        if (event) {
            await worker.enqueue('determineNotifications', { _id: event._id });
        }
    }
}

class DetermineNotifications extends Runner {
    static url = `${gconfig.sqsUrlPrefix}-determineNotifications.fifo`

    defaultLimit = 1000;

    async run (message, { gateway, worker, services }) {
        const event = await gateway.events.find({ _id: ObjectId(message._id) });

        if (!event) {
            throw new Error(`Event not found for ${JSON.stringify(message)}`);
        }

        if (message.liveSegmentId) {
            const terminalLiveSegment = await gateway.liveSegments.find({
                _id: ObjectId(message.liveSegmentId)
            });
            await hermod.enqueueNotifications(event, terminalLiveSegment, worker, { services });
        } else {
            const limit = message.limit || this.defaultLimit;
            const transportClient = transport.getClient();
            const terminalLiveSegments = await transportClient.findTerminalLiveSegmentsForEvent(
                event,
                { limit, after: message.after }
            );

            for (const terminalLiveSegment of terminalLiveSegments) {
                await worker.enqueue('determineNotifications', {
                    _id: event._id,
                    liveSegmentId: terminalLiveSegment._id
                });
            }

            if (terminalLiveSegments.length === limit) {
                const after = terminalLiveSegments.slice(-1)[0]._id;

                if (after) {
                    await worker.enqueue('determineNotifications', {
                        _id: event._id,
                        limit,
                        after
                    });
                }
            }
        }
    }
}

module.exports = {
    ProcessSourceRunner,
    ProcessRowRunner,
    DetermineNotifications
};
