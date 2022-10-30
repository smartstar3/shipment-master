const { expect, factory } = require('chai');

const { buildNotifications } = require('../../app/repositories/narvar');

describe('narvar', () => {
    describe('buildNotifications', () => {
        it('builds a notification', async () => {
            const liveSegment = await factory.create('liveSegment');
            const event = await factory.create('event', { liveSegmentId: liveSegment._id });
            const shipment = await factory.create('shipment', {
                shipper: 3, // Narvar only pushing notifications for certain shippers.
                docs: [{
                    vendor: liveSegment.provider,
                    doc: { trackingNumber: liveSegment.trackingNumber }
                }]
            });

            const notifications = await buildNotifications(event, liveSegment, { shipment });
            expect(notifications).to.have.lengthOf(1);
            expect(notifications[0].requestor).to.eql({ shipper: 3 });
            expect(notifications[0].request.body.trackingNo).to.eq(liveSegment.trackingNumber);
        });

        it('returns null if org not enabled', async () => {
            const liveSegment = await factory.create('liveSegment');
            const event = await factory.create('event', { liveSegmentId: liveSegment._id });
            const shipment = await factory.create('shipment', {
                shipper: 0,
                docs: [{
                    vendor: liveSegment.provider,
                    doc: { trackingNumber: liveSegment.trackingNumber }
                }]
            });

            expect(await buildNotifications(event, liveSegment, { shipment })).to.eql([]);
        });

        it('sends X tracking number for certain retailers', async () => {
            const liveSegment = await factory.create('liveSegment', { terminal: true });
            const event = await factory.create('event', {
                liveSegmentId: liveSegment._id,
                trackingNumber: liveSegment.trackingNumber,
                expectedDeliveryDate: null
            });

            const org = await factory.create('organization', {
                shipperSeqNum: 12 // Narvar only pushes notifications for certain customers.
            });
            const shipment = await factory.create('shipment', {
                shipper: org.shipperSeqNum,
                docs: [{
                    vendor: liveSegment.provider,
                    doc: { trackingNumber: liveSegment.trackingNumber }
                }]
            });

            const notifications = await buildNotifications(event, liveSegment, { shipment });

            expect(notifications).to.have.lengthOf(1);
            expect(notifications[0].request.body.trackingNo).to.eq(shipment.tn);
        });
    });
});
