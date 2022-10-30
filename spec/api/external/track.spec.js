const uuid = require('uuid');
const { expect, factory, request } = require('chai');
const { getFutureDeliveryDate, getToday, getPastDeliveryDate } = require('../../helper/time');
const { UnauthorizedError } = require('errors');

const transport = require('../../../app/repositories/transport');

describe('/service/v1', () => {
    given('transport', () => {
        return transport.get();
    });

    describe('GET /track/:trackingNumber', () => {
        it('requires authentication', async () => {
            const response = await request(global.server)
                .get('/service/v1/track/1234');

            expect(response.status).to.eq(401);
            expect(response.body).excluding('request_id').to.eql(UnauthorizedError.toJSON());
        });

        it('returns a 404 if no shipment found', async () => {
            const org = await factory.create('organization');

            const response = await request(global.server)
                .get('/service/v1/track/1234')
                .auth(org.apiId, org.apiKey);

            expect(response.status).to.eq(404);
            expect(response.body).excluding('request_id').to.eql({
                error_code: 404,
                error_msg: 'The requested resource could not be found.',
                error_fields: []
            });
        });

        it('returns events if shipment is found without lane', async () => {
            const trackingNumber = uuid.v4();
            const yesterday = getPastDeliveryDate('America/Chicago', 1, true);
            const tomorrow = getFutureDeliveryDate('America/Chicago', 1);

            const org = await factory.create('organization');
            const shipment = await factory.create('shipment', {
                shipper: org.shipperSeqNum,
                docs: [{ vendor: 'DHLeCommerce', doc: { trackingNumber: trackingNumber } }],
                created_date: new Date(yesterday)
            });

            const event = await factory.create('event', {
                provider: 'DHLeCommerce',
                trackingNumber: trackingNumber,
                timestamp: tomorrow
            });

            const response = await request(global.server)
                .get(`/service/v1/track/${shipment.tn.toString()}`)
                .auth(org.apiId, org.apiKey);

            expect(response.status).to.eq(200);
            expect(response.body).to.eql({
                tracking_number: shipment.tn.toString(),
                status: 'In-Transit',
                expectedDeliveryDate: tomorrow,
                events: [
                    {
                        timestamp: shipment.created_date.toISOString(),
                        status: 'Label Created',
                        message: 'Label has been created',
                        location: {
                            city: shipment.from_address.city,
                            state: shipment.from_address.state,
                            zip: shipment.from_address.zip,
                            lat: null,
                            lng: null,
                            timezone: null
                        },
                        expectedDeliveryDate: null,
                        signature: null,
                        signatureUrl: null
                    },
                    {
                        timestamp: event.timestamp,
                        status: event.externalStatus,
                        message: event.message,
                        location: {
                            city: event.location.city || null,
                            state: event.location.state || null,
                            zip: event.location.zip || null,
                            lat: event.location.lat || null,
                            lng: event.location.lng || null,
                            timezone: event.location.timezone || null
                        },
                        expectedDeliveryDate: event.expectedDeliveryDate,
                        signature: null,
                        signatureUrl: null
                    }
                ]
            });
        });

        it('returns all events from a live lane', async () => {
            const parcelTrackingNumber = uuid.v4();
            const freightrackingNumber = uuid.v4();

            const yesterday = getPastDeliveryDate('America/Chicago', 1);
            const today = getToday('America/Chicago', true);
            const tomorrow = getFutureDeliveryDate('America/Chicago', 1);

            const org = await factory.create('organization');
            const shipment = await factory.create('shipment', {
                shipper: org.shipperSeqNum,
                docs: [{ vendor: 'DHLeCommerce', doc: { trackingNumber: parcelTrackingNumber } }],
                created_date: new Date(yesterday)
            });

            const freightLiveSegment = await factory.create('liveSegment', {
                trackingNumber: freightrackingNumber
            });

            const freightEvent = await factory.create('event', {
                trackingNumber: freightrackingNumber,
                liveSegmentId: freightLiveSegment._id,
                timestamp: today.toISO()
            });

            const parcelLiveSegment = await factory.create('liveSegment', {
                provider: 'DHLeCommerce',
                trackingNumber: parcelTrackingNumber,
                terminal: true,
                lane: [freightLiveSegment._id]
            });
            const parcelEvent = await factory.create('event', {
                trackingNumber: parcelTrackingNumber,
                provider: 'DHLeCommerce',
                liveSegmentId: parcelLiveSegment._id
            });

            const response = await request(global.server)
                .get(`/service/v1/track/${shipment.tn.toString()}`)
                .auth(org.apiId, org.apiKey);
            expect(response.status).to.eq(200);
            expect(response.body).to.eql({
                tracking_number: shipment.tn.toString(),
                status: 'In-Transit',
                expectedDeliveryDate: tomorrow,
                events: [
                    {
                        timestamp: shipment.created_date.toISOString(),
                        status: 'Label Created',
                        message: 'Label has been created',
                        location: {
                            city: shipment.from_address.city,
                            state: shipment.from_address.state,
                            zip: shipment.from_address.zip,
                            lat: null,
                            lng: null,
                            timezone: null
                        },
                        expectedDeliveryDate: null,
                        signature: null,
                        signatureUrl: null
                    },
                    {
                        timestamp: freightEvent.timestamp,
                        status: freightEvent.externalStatus,
                        message: freightEvent.message,
                        location: {
                            city: freightEvent.location.city || null,
                            state: freightEvent.location.state || null,
                            zip: freightEvent.location.zip || null,
                            lat: freightEvent.location.lat || null,
                            lng: freightEvent.location.lng || null,
                            timezone: freightEvent.location.timezone || null
                        },
                        expectedDeliveryDate: freightEvent.expectedDeliveryDate,
                        signature: null,
                        signatureUrl: null
                    },
                    {
                        timestamp: parcelEvent.timestamp,
                        status: parcelEvent.externalStatus,
                        message: parcelEvent.message,
                        location: {
                            city: parcelEvent.location.city || null,
                            state: parcelEvent.location.state || null,
                            zip: parcelEvent.location.zip || null,
                            lat: parcelEvent.location.lat || null,
                            lng: parcelEvent.location.lng || null,
                            timezone: parcelEvent.location.timezone || null
                        },
                        expectedDeliveryDate: parcelEvent.expectedDeliveryDate,
                        signature: null,
                        signatureUrl: null
                    }
                ]
            });
        });

        it('returns label created status if no events are found', async () => {
            const today = getToday('America/Chicago').toISO();
            const plusThree = getFutureDeliveryDate('America/Chicago', 3);

            const org = await factory.create('organization');
            const shipment = await factory.create('shipment', {
                shipper: org.shipperSeqNum,
                docs: [{ vendor: 'DHLeCommerce', doc: { trackingNumber: uuid.v4() } }],
                created_date: new Date(today) // monday
            });

            const response = await request(global.server)
                .get(`/service/v1/track/${shipment.tn.toString()}`)
                .auth(org.apiId, org.apiKey);

            expect(response.status).to.eq(200);
            expect(response.body).to.eql({
                tracking_number: shipment.tn.toString(),
                status: 'Label Created',
                events: [{
                    timestamp: shipment.created_date.toISOString(),
                    status: 'Label Created',
                    message: 'Label has been created',
                    location: {
                        city: shipment.from_address.city,
                        state: shipment.from_address.state,
                        zip: shipment.from_address.zip,
                        lat: null,
                        lng: null,
                        timezone: null
                    },
                    expectedDeliveryDate: null,
                    signature: null,
                    signatureUrl: null
                }],
                expectedDeliveryDate: plusThree
            });
        });

        it('returns not found if shipment is for different org', async () => {
            const org = await factory.create('organization');
            const shipment = await factory.create(
                'shipment',
                { shipper: org.shipperSeqNum + 1 }
            );

            const response = await request(global.server)
                .get(`/service/v1/track/${shipment.tn.toString()}`)
                .auth(org.apiId, org.apiKey);

            expect(response.status).to.eq(404);
            expect(response.body).excluding('request_id').to.eql({
                error_code: 404,
                error_msg: 'The requested resource could not be found.',
                error_fields: []
            });
        });
    });
});
