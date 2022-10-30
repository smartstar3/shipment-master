const { expect, factory, request } = require('chai');
const { ForbiddenError, UnauthorizedError } = require('errors');

const transport = require('../../../../app/repositories/transport');
const {
    carriers,
    createShipment,
    getAuthorizationParts,
    sendAuthorizedChaiRequest,
    testLabelRequest,
    testRateRequest
} = require('./utils');

describe.skip('/integrations/shippo', function () {
    given('transport', function () {
        return transport.get();
    });

    describe('POST /integrations/shippo/services/carrier/cancellations', function () {
        const path = '/integrations/shippo/services/carrier/cancellations';

        it('requires authentication', async function () {
            const response = await request(global.server)
                .post(path)
                .send({});

            expect(response.status).to.eq(401);
            expect(response.body).to.eql(UnauthorizedError.toJSON());
        });

        it('returns 422 error on malformed body', async function () {
            const reqOpts = {
                method: 'POST',
                path,
                body: '{ badJson }'
            };

            const response = await sendAuthorizedChaiRequest(reqOpts);

            expect(response.status).to.eq(422);
            expect(response.body.error_msg).to.eq('The request was well-formed but was unable to be followed due to semantic errors.');
        });

        it('returns 422 error on missing tracking_numbers in body', async function () {
            const reqOpts = {
                method: 'POST',
                path,
                body: { foo: 'bar' }
            };

            const response = await sendAuthorizedChaiRequest(reqOpts);

            expect(response.status).to.eq(422);
            expect(response.body.error_msg).to.eq('The request was well-formed but was unable to be followed due to semantic errors.');
        });

        it('returns label_not_found status_code if no shipment found', async function () {
            const reqOpts = {
                method: 'POST',
                path,
                body: { tracking_numbers: ['badtracking'] }
            };

            const response = await sendAuthorizedChaiRequest(reqOpts);

            expect(response.status).to.eq(201);
            expect(response.body[0]).to.include({
                tracking_number: 'badtracking',
                approved: false,
                status_code: 'label_not_found'
            });
        });

        it('returns label_already_used status_code if the shipment was delivered', async function () {
            this.timeout(5000);

            const { shipment } = await createShipment({ delivered: true });

            const trackingNumber = shipment.tn.toString();

            const reqOpts = {
                method: 'POST',
                path,
                body: { tracking_numbers: [trackingNumber] }
            };

            const response = await sendAuthorizedChaiRequest(reqOpts);

            expect(response.status).to.eq(201);
            expect(response.body[0]).to.include({
                tracking_number: trackingNumber,
                approved: false,
                status_code: 'label_already_used'
            });
        });

        it('returns cancellation_failed status_code if the shipment was already cancelled', async function () {
            this.timeout(5000);

            const { shipment } = await createShipment({ cancelled: true });

            const trackingNumber = shipment.tn.toString();

            const reqOpts = {
                method: 'POST',
                path,
                body: { tracking_numbers: [trackingNumber] }
            };

            const response = await sendAuthorizedChaiRequest(reqOpts);

            expect(response.status).to.eq(201);
            expect(response.body[0]).to.include({
                tracking_number: trackingNumber,
                approved: false,
                status_code: 'cancellation_failed'
            });
        });

        it('cancels shipment', async function () {
            this.timeout(5000);

            const { shipment } = await createShipment();

            const trackingNumber = shipment.tn.toString();

            const reqOpts = {
                method: 'POST',
                path,
                body: { tracking_numbers: [trackingNumber] }
            };

            const response = await sendAuthorizedChaiRequest(reqOpts);

            expect(response.status).to.eq(201);
            expect(response.body[0]).to.include({
                tracking_number: trackingNumber,
                approved: true,
                status_code: 'approved'
            });
        });
    });

    describe('POST /integrations/shippo/services/carrier/labels', function () {
        const path = '/integrations/shippo/services/carrier/labels';

        it('requires authentication', async function () {
            const response = await request(global.server)
                .post(path)
                .send({});

            expect(response.status).to.eq(401);
            expect(response.body).to.eql(UnauthorizedError.toJSON());
        });

        it('requires account AccountToken header for authorization', async function () {
            const { body } = await getAuthorizationParts();

            const reqOpts = {
                method: 'POST',
                path,
                body
            };

            const response = await sendAuthorizedChaiRequest(reqOpts);

            expect(response.status).to.eq(403);
            expect(response.body).to.eql(ForbiddenError.toJSON());
        });

        it('requires account object in body for authorization', async function () {
            const { body, headers } = await getAuthorizationParts();
            delete body.account;

            const reqOpts = {
                method: 'POST',
                path,
                body,
                headers
            };

            const response = await sendAuthorizedChaiRequest(reqOpts);

            expect(response.status).to.eq(403);
            expect(response.body).to.eql(ForbiddenError.toJSON());
        });

        it('requires matching organization authorization credentials', async function () {
            const { body } = await getAuthorizationParts();
            delete body.account;

            const reqOpts = {
                method: 'POST',
                path,
                body,
                headers: { AccountToken: 'badtoken' }
            };

            const response = await sendAuthorizedChaiRequest(reqOpts);

            expect(response.status).to.eq(403);
            expect(response.body).to.eql(ForbiddenError.toJSON());
        });

        it('returns 422 error on malformed body', async function () {
            const { headers } = await getAuthorizationParts();

            const reqOpts = {
                method: 'POST',
                path,
                body: '{ badJson }',
                headers
            };

            const response = await sendAuthorizedChaiRequest(reqOpts);

            expect(response.status).to.eq(422);
            expect(response.body.error_msg).to.eq('The request was well-formed but was unable to be followed due to semantic errors.');
        });

        describe('creates orders for all carriers', async function () {
            for (const carrier of Object.keys(carriers)) {
                it(`creates a ${carrier} order`, async function () {
                    this.timeout(5000);

                    await testLabelRequest({
                        carrier,
                        mochaThis: this,
                        path
                    });
                });
            }
        });
    });

    describe('POST /integrations/shippo/services/carrier/rates', function () {
        const path = '/integrations/shippo/services/carrier/rates';

        it('requires authentication', async function () {
            const response = await request(global.server)
                .post(path)
                .send({});

            expect(response.status).to.eq(401);
            expect(response.body).to.eql(UnauthorizedError.toJSON());
        });

        it('requires account AccountToken header for authorization', async function () {
            const { body } = await getAuthorizationParts();

            const reqOpts = {
                method: 'POST',
                path,
                body
            };

            const response = await sendAuthorizedChaiRequest(reqOpts);

            expect(response.status).to.eq(403);
            expect(response.body).to.eql(ForbiddenError.toJSON());
        });

        it('requires account object in body for authorization', async function () {
            const { body, headers } = await getAuthorizationParts();
            delete body.account;

            const reqOpts = {
                method: 'POST',
                path,
                body,
                headers
            };

            const response = await sendAuthorizedChaiRequest(reqOpts);

            expect(response.status).to.eq(403);
            expect(response.body).to.eql(ForbiddenError.toJSON());
        });

        it('requires matching organization authorization credentials', async function () {
            const { body } = await getAuthorizationParts();
            delete body.account;

            const reqOpts = {
                method: 'POST',
                path,
                body,
                headers: { AccountToken: 'badtoken' }
            };

            const response = await sendAuthorizedChaiRequest(reqOpts);

            expect(response.status).to.eq(403);
            expect(response.body).to.eql(ForbiddenError.toJSON());
        });

        it('returns 422 error on malformed body', async function () {
            const { headers } = await getAuthorizationParts();

            const reqOpts = {
                method: 'POST',
                path,
                body: '{ badJson }',
                headers
            };

            const response = await sendAuthorizedChaiRequest(reqOpts);

            expect(response.status).to.eq(422);
            expect(response.body.error_msg).to.eq('The request was well-formed but was unable to be followed due to semantic errors.');
        });

        it('successfully gets rates', async function () {
            this.timeout(5000);

            await testRateRequest({ path });
        });
    });

    describe('POST /integrations/shippo/services/carrier/tracks', function () {
        const path = '/integrations/shippo/services/carrier/tracks';

        it('requires authentication', async function () {
            const response = await request(global.server)
                .post(path)
                .send({});

            expect(response.status).to.eq(401);
            expect(response.body).to.eql(UnauthorizedError.toJSON());
        });

        it('returns 422 error on malformed body', async function () {
            const reqOpts = {
                method: 'POST',
                path,
                body: '{ badJson }'
            };

            const response = await sendAuthorizedChaiRequest(reqOpts);

            expect(response.status).to.eq(422);
            expect(response.body.error_msg).to.eq('The request was well-formed but was unable to be followed due to semantic errors.');
        });

        it('returns 422 error on missing tracking_numbers in body', async function () {
            const reqOpts = {
                method: 'POST',
                path,
                body: { foo: 'bar' }
            };

            const response = await sendAuthorizedChaiRequest(reqOpts);

            expect(response.status).to.eq(422);
            expect(response.body.error_msg).to.eq('The request was well-formed but was unable to be followed due to semantic errors.');
        });

        it('returns a skeleton object when tracking number not found', async function () {
            const reqOpts = {
                method: 'POST',
                path,
                body: { tracking_numbers: ['badtracking'] }
            };

            const response = await sendAuthorizedChaiRequest(reqOpts);

            expect(response.status).to.eq(201);
            expect(response.body[0]).to.eql({
                tracking_number: 'badtracking',
                status: 'unknown',
                tracking_events: [],
                messages: []
            });
        });

        it('returns with single transit event when no lane found', async function () {
            this.timeout(5000);

            const { shipment } = await createShipment({ createLane: false });
            const { plusFour } = await factory.create('expectedDeliveryDates');

            const trackingNumber = shipment.tn.toString();

            const reqOpts = {
                method: 'POST',
                path,
                body: {
                    tracking_numbers: [trackingNumber]
                }
            };

            const response = await sendAuthorizedChaiRequest(reqOpts);
            const body = response.body[0];

            expect(response.status).to.eq(201);
            expect(body).to.deep.include({
                tracking_number: trackingNumber,
                eta: plusFour,
                status: 'transit',
                recipient_location: {
                    city: shipment.to_address.city,
                    state: shipment.to_address.state,
                    zip: shipment.to_address.zip,
                    country: shipment.to_address.country
                },
                messages: []
            });
            expect(body.tracking_events).to.be.an('array').with.lengthOf(2);
            expect(body.tracking_events[0]).to.deep.include({
                status_code: 'information_received',
                status_details: 'Label has been created',
                location: {
                    city: 'Santa Fe Springs',
                    state: 'CA',
                    zip: '90670',
                    country: 'US'
                }
            });
            expect(body.tracking_events[1]).to.deep.include({
                status_code: 'delivery_scheduled',
                status_details: 'IN TRANSIT',
                location: {
                    city: 'OKLAHOMA CITY',
                    state: 'OK',
                    country: 'US'
                }
            });
        });

        it('returns all events from a lane', async function () {
            this.timeout(5000);

            const { shipment } = await createShipment({ createLane: true });
            const { plusFour } = await factory.create('expectedDeliveryDates');

            const trackingNumber = shipment.tn.toString();

            const reqOpts = {
                method: 'POST',
                path,
                body: {
                    tracking_numbers: [trackingNumber]
                }
            };

            const response = await sendAuthorizedChaiRequest(reqOpts);
            const body = response.body[0];

            expect(response.status).to.eq(201);
            expect(body).to.deep.include({
                tracking_number: trackingNumber,
                eta: plusFour,
                status: 'transit',
                recipient_location: {
                    city: shipment.to_address.city,
                    state: shipment.to_address.state,
                    zip: shipment.to_address.zip,
                    country: shipment.to_address.country
                },
                messages: []
            });
            expect(body.tracking_events).to.be.an('array').with.lengthOf(3);
            expect(body.tracking_events[0]).to.deep.include({
                status_code: 'information_received',
                status_details: 'Label has been created',
                location: {
                    city: 'Santa Fe Springs',
                    state: 'CA',
                    zip: '90670',
                    country: 'US'
                }
            });
            expect(body.tracking_events[1]).to.deep.include({
                status_code: 'delivery_scheduled',
                status_details: 'IN TRANSIT',
                location: {
                    city: 'OKLAHOMA CITY',
                    state: 'OK',
                    country: 'US'
                }
            });
            expect(body.tracking_events[2]).to.deep.include({
                status_code: 'delivery_scheduled',
                status_details: 'IN TRANSIT',
                location: {
                    city: 'OKLAHOMA CITY',
                    state: 'OK',
                    country: 'US'
                }
            });
        });

        it('returns label created status if no events are found', async function () {
            this.timeout(5000);

            const { shipment } = await createShipment({ noEvents: true });
            const { plusFour } = await factory.create('expectedDeliveryDates');

            const trackingNumber = shipment.tn.toString();

            const reqOpts = {
                method: 'POST',
                path,
                body: {
                    tracking_numbers: [trackingNumber]
                }
            };

            const response = await sendAuthorizedChaiRequest(reqOpts);
            const body = response.body[0];

            expect(response.status).to.eq(201);
            expect(body).to.deep.include({
                tracking_number: trackingNumber,
                eta: plusFour,
                status: 'pre-transit',
                recipient_location: {
                    city: shipment.to_address.city,
                    state: shipment.to_address.state,
                    zip: shipment.to_address.zip,
                    country: shipment.to_address.country
                },
                messages: []
            });
            expect(body.tracking_events).to.be.an('array').with.lengthOf(1);
            expect(body.tracking_events[0]).to.deep.include({
                status_code: 'information_received',
                status_details: 'Label has been created',
                location: {
                    city: 'Santa Fe Springs',
                    state: 'CA',
                    zip: '90670',
                    country: 'US'
                }
            });
        });
    });
});
