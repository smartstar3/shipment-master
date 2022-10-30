const { expect, factory } = require('chai');

const { present } = require('../../app/presenters/event');
const { STATUSES: { IN_TRANSIT, DELIVERED } } = require('../../app/constants/trackingConstants');

describe('Event Presenter', () => {
    describe('present', () => {
        it('presents an event', async () => {
            const event = await factory.create('event', {
                location: {
                    city: 'PITTSFORD',
                    state: 'NY',
                    zip: '14534',
                    lat: 0.1,
                    lng: -0.1,
                    timezone: 'America/New_York'
                }
            });

            expect(await present(event)).to.eql({
                timestamp: event.timestamp,
                status: event.externalStatus,
                message: event.message,
                location: {
                    city: event.location.city,
                    state: event.location.state,
                    zip: event.location.zip,
                    lat: event.location.lat,
                    lng: event.location.lng,
                    timezone: event.location.timezone
                },
                expectedDeliveryDate: event.expectedDeliveryDate,
                signature: null,
                signatureUrl: null
            });
        });

        it('presents signature and presigned signature url', async () => {
            const signatureUrl = 'https://test-onelivex.s3.amazonaws.com/signatures/F99E7FA8-B9A3-40AD-97BB-33D727031EFC.png';
            const event = await factory.create('event', {
                externalStatus: DELIVERED,
                signature: 'Han Solo',
                signatureUrl
            });

            const result = await present(event);
            expect(result.signature).to.include('Han Solo');
            expect(result.signatureUrl).to.include('signatures/F99E7FA8-B9A3-40AD-97BB-33D727031EFC.png');
            expect(result.signatureUrl).to.include('X-Amz-Signature');
        });

        it('does not present signature and signature url for non-delivered events', async () => {
            const event = await factory.create('event', {
                externalStatus: IN_TRANSIT,
                signature: 'Han Solo',
                signatureUrl: 'https://test-onelivex.s3.amazonaws.com/olx/signatures/F99E7FA8-B9A3-40AD-97BB-33D727031EFC.png'
            });

            const result = await present(event);
            expect(result.signature).to.eq(null);
            expect(result.signatureUrl).to.eq(null);
        });
    });
});
