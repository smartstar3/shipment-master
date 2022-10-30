const { expect, factory } = require('chai');

const hermod = require('../../app/repositories/hermod');
const scv = require('../../app/repositories/scv');

class Service {
    constructor (url) {
        this.url = url;
    }

    async buildNotifications (event, liveSegment, { shipment }) {
        if (this.url instanceof Error) {
            throw this.url;
        }

        return {
            requestor: { shipper: shipment.shipper },
            request: {
                url: this.url,
                body: {
                    eventTrackingNumber: event.trackingNumber,
                    liveSegmentTrackingNumber: liveSegment.trackingNumber,
                    shipmentTrackingNumber: shipment.tn
                }
            }
        };
    }
}

describe('hermod', () => {
    describe('enqueueNotifications', () => {
        it('creates notifications', async () => {
            const liveSegment = await factory.create('liveSegment', { terminal: false });
            const terminalLiveSegment = await factory.create('liveSegment', {
                terminal: true,
                lane: [liveSegment._id]
            });
            const event = await factory.create('event', {
                liveSegmentId: liveSegment._id,
                trackingNumber: liveSegment.trackingNumber,
                expectedDeliveryDate: new Date().toISOString()
            });

            await factory.create('shipment', {
                docs: [{
                    vendor: terminalLiveSegment.provider,
                    doc: { trackingNumber: terminalLiveSegment.trackingNumber }
                }]
            });

            const url = 'https://foo.bar.com/webhook';
            const service = new Service(url);
            await hermod.enqueueNotifications(
                event,
                terminalLiveSegment,
                scv.get(),
                { services: [service] }
            );

            const notifications = await hermod.getClient().findNotifications();
            expect(notifications).to.have.lengthOf(1);
        });

        it('does nothing if event is hidden', async () => {
            const liveSegment = await factory.create('liveSegment', { terminal: true });
            const event = await factory.create('event', {
                liveSegmentId: liveSegment._id,
                trackingNumber: liveSegment.trackingNumber,
                hidden: true
            });

            await factory.create('shipment', {
                docs: [{
                    vendor: liveSegment.provider,
                    doc: { trackingNumber: liveSegment.trackingNumber }
                }]
            });

            const service = new Service(new Error('should not get here'));
            await hermod.enqueueNotifications(event, { services: [service] });

            const notifications = await hermod.getClient().findNotifications();
            expect(notifications).to.have.lengthOf(0);
        });
    });
});
