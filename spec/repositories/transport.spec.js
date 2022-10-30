const { expect, factory } = require('chai');
const { Transport } = require('@onelive-dev/transport');

const {
    getTerminalProvider,
    getTerminalTrackingNumber
} = require('../../app/repositories/shipments');
const { getClient, getTrackingForShipment } = require('../../app/repositories/transport');
const { STATUSES: { LABEL_CREATED } } = require('../../app/constants/trackingConstants');

describe('transport', () => {
    describe('getClient', () => {
        it('returns Transport instance', () => {
            expect(getClient()).to.be.instanceOf(Transport);
        });
    });

    describe('getTrackingForShipment', () => {
        it('gets events with label created event added', async () => {
            const shipment = await factory.create('shipment');
            const event = await factory.create('event', {
                provider: 'OnTrac',
                trackingNumber: shipment.docs[0].doc.trackingNumber
            });

            const events = await getTrackingForShipment(shipment);
            expect(events).to.have.lengthOf(2);
            expect(events[0].internalStatus).to.eq(LABEL_CREATED);
            expect(events[1]).to.eql({ ...event, terminal: true });
        });

        it('gets events with label already created in data store', async () => {
            const shipment = await factory.create('shipment');
            const createdEvent = await getClient().buildCreatedEvent({
                trackingNumber: getTerminalTrackingNumber(shipment),
                terminalProvider: getTerminalProvider(shipment),
                createdAt: shipment.created_date,
                location: {
                    city: shipment.from_address?.city,
                    state: shipment.from_address?.state,
                    zip: shipment.from_address?.zip
                }
            });
            const event = await factory.create('event', {
                provider: 'OnTrac',
                trackingNumber: shipment.docs[0].doc.trackingNumber
            });

            const events = await getTrackingForShipment(shipment);
            expect(events).to.have.lengthOf(2);
            expect(events).to.eql([{ ...createdEvent, terminal: true }, { ...event, terminal: true }]);
        });

        it('skips events for old live segment', async () => {
            const shipment = await factory.create('shipment');
            const oldLiveSegment = await factory.create('liveSegment', {
                trackingNumber: shipment.docs[0].doc.trackingNumber,
                shipDate: new Date('2020-01-01'),
                terminal: true
            });
            await factory.create('event', {
                trackingNumber: shipment.docs[0].doc.trackingNumber,
                liveSegmentId: oldLiveSegment._id
            });

            const liveSegment = await factory.create('liveSegment', {
                trackingNumber: shipment.docs[0].doc.trackingNumber,
                terminal: true
            });
            const event = await factory.create('event', {
                trackingNumber: shipment.docs[0].doc.trackingNumber,
                liveSegmentId: liveSegment._id
            });

            const events = await getTrackingForShipment(shipment);
            expect(events).to.have.lengthOf(2);
            expect(events[0].internalStatus).to.eq(LABEL_CREATED);
            expect(events[1]).to.eql({ ...event, terminal: true });
        });

        it('skips events for other other last mile segments', async () => {
            const shipment = await factory.create('shipment', {
                docs: [{
                    vendor: 'DHLeCommerce',
                    doc: { trackingNumber: '12345ABCDE' }
                }]
            });

            const liveSegment = await factory.create('liveSegment');
            const event = await factory.create('event', {
                trackingNumber: liveSegment.trackingNumber,
                liveSegmentId: liveSegment._id,
                provider: 'X'
            });

            const otherLiveSegment = await factory.create('liveSegment', {
                trackingNumber: '12345ABCDE',
                provider: 'DHLeCommerce',
                terminal: true,
                lane: [liveSegment._id]
            });
            const otherEvent = await factory.create('event', {
                trackingNumber: otherLiveSegment.trackingNumber,
                liveSegmentId: otherLiveSegment._id,
                provider: 'DHLeCommerce'
            });

            const wrongLiveSegment = await factory.create('liveSegment', {
                provider: 'DHLeCommerce',
                terminal: true
            });
            await factory.create('event', {
                trackingNumber: wrongLiveSegment.trackingNumber,
                liveSegmentId: wrongLiveSegment._id,
                provider: 'DHLeCommerce'
            });

            const events = await getTrackingForShipment(shipment);
            expect(events).to.have.lengthOf(3);
            expect(events[0].internalStatus).to.eq(LABEL_CREATED);
            expect(events[1]).to.eql({ ...otherEvent, terminal: true });
            expect(events[2]).to.eql(event);
        });
    });
});
