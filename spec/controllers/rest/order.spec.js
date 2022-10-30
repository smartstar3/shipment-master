const { DateTime } = require('luxon');
const { expect, factory } = require('chai');
const { UnprocessableEntityError, NotFoundError } = require('errors');

const hermod = require('../../../app/repositories/hermod');
const {
    createOrderMiddleware,
    cancelOrderMiddleware,
    validateOrderMiddleware
} = require('../../../app/controllers/rest/order');
const { getShipmentById } = require('../../../app/repositories/shipments');
const { getTrackingForShipment } = require('../../../app/repositories/transport');
const { MockResponse } = require('../../helper/mockResponse');
const { ORDER_STATUS } = require('../../../app/constants/carrierConstants');

describe('order controller', () => {
    describe('validateOrderMiddleware', () => {
        it('successfully validates orders', async () => {
            await factory.create('sequence', { name: 'OlxTracker' });
            const org = await factory.create('organization');
            const zipZone = await factory.create('udsZipZone');

            const body = await factory.create('orderRequest', {
                to_address: { zip: zipZone.zipcode }
            });

            const req = { org, body };
            const res = new MockResponse();
            const next = () => 'OK';

            await validateOrderMiddleware(req, res, next);

            expect(req.body).to.deep.eq(body);
        });

        it('successfully validates orders with zip+4', async () => {
            await factory.create('sequence', { name: 'OlxTracker' });
            const org = await factory.create('organization');
            const zipPlusFour = '01102-2341';
            await factory.create('udsZipZone', { zipcode: '01102' });

            const body = await factory.create('orderRequest', {
                to_address: { zip: zipPlusFour }
            });

            const req = { org, body };
            const res = new MockResponse();
            const next = () => 'OK';

            await validateOrderMiddleware(req, res, next);

            expect(req.body.to_address.zip).to.eq('01102');
        });

        it('successfully validates orders with business flag on to address', async () => {
            await factory.create('sequence', { name: 'OlxTracker' });
            const org = await factory.create('organization');
            await factory.create('udsZipZone', { zipcode: '01102' });

            const body = await factory.create(
                'orderRequest',
                { to_address: { business: true } }
            );

            const req = { org, body };
            const res = new MockResponse();
            const next = () => 'OK';

            await validateOrderMiddleware(req, res, next);

            expect(req.body.to_address.business).to.be.true;
        });

        it('successfully validates orders for tobacco orgs', async () => {
            await factory.create('sequence', { name: 'OlxTracker' });
            const org = await factory.create('organization', { settings: { tobacco: true } });
            const zipZone = await factory.create('hackbarthZipZone');

            const body = await factory.create('orderRequest', {
                to_address: { zip: zipZone.zipcode }
            });

            const req = { org, body };
            const res = new MockResponse();
            const next = () => 'OK';
            await validateOrderMiddleware(req, res, next);

            expect(req.body.parcel.attributes).to.deep.eq({
                substance: 'tobacco',
                delivery_confirmation: '21_signature_required'
            });
        });

        it('rejects business tobacco shipments if org not configured', async () => {
            await factory.create('sequence', { name: 'OlxTracker' });
            const org = await factory.create('organization', { settings: { tobacco: true } });
            const zipZone = await factory.create('hackbarthZipZone');

            const body = await factory.create(
                'orderRequest',
                { to_address: { zip: zipZone.zipcode, business: true } }
            );

            const req = { org, body };
            const res = new MockResponse();
            const next = (err) => (err);

            try {
                await validateOrderMiddleware(req, res, next);
            } catch (e) {
                expect(e.message).to.equal('The request was well-formed but was unable to be followed due to semantic errors.');
                expect(e.errors).to.eql([{ name: 'to_address.business', message: 'the shipper has not been configured for tobacco shipments to business addresses' }]);
            }
        });

        it('successfully validates business tobacco order', async () => {
            await factory.create('sequence', { name: 'OlxTracker' });
            const org = await factory.create(
                'organization',
                { settings: { tobacco: true, tobaccoShipToBusiness: true } }
            );
            const zipZone = await factory.create('hackbarthZipZone');

            const body = await factory.create(
                'orderRequest',
                { to_address: { zip: zipZone.zipcode, business: true } }
            );

            const req = { org, body };
            const res = new MockResponse();
            const next = () => 'OK';
            await validateOrderMiddleware(req, res, next);

            expect(req.body.parcel.attributes).to.deep.eq({
                substance: 'tobacco',
                delivery_confirmation: '21_signature_required'
            });
            expect(req.body.to_address.business).to.be.true;
        });

        it('rejects request with invalid body', async () => {
            const org = await factory.create('organization');
            const req = { org, body: {} };
            const res = new MockResponse();
            const next = (err) => (err);

            try {
                await validateOrderMiddleware(req, res, next);
            } catch (e) {
                expect(e.message).to.equal('The request was well-formed but was unable to be followed due to semantic errors.');
                expect(e.errors).to.eql([{ name: 'shipper_name', message: '"shipper_name" is required' }]);
            }
        });
    });

    describe('createOrderMiddleware', () => {
        it('successfully creates orders', async () => {
            await factory.create('sequence', { name: 'OlxTracker' });
            const org = await factory.create('organization');
            const zipZone = await factory.create('udsZipZone');
            const zip = zipZone.zipcode;
            const zipPrefix = zip.slice(0, 3);
            await factory.create('zoneMatrix', {
                prefix: zipPrefix,
                matrix: new Array(999).fill('1*')
            });
            await factory.create('rateCards', {
                shipperId: org.shipperSeqNum,
                zone: 1,
                weight: 3,
                cost: 5.00
            });

            const body = await factory.create('orderRequest', { to_address: { zip } });

            const req = { org, body };
            const res = new MockResponse();

            await createOrderMiddleware(req, res);

            expect(res.statusCode).to.eq(201);
            expect(typeof res.data.label_base64).to.eq('string');

            const shipment = await getShipmentById(res.data.parcel.tracking_num);
            expect(shipment.tn).to.startWith('X');

            const events = await getTrackingForShipment(shipment);
            expect(events).to.have.lengthOf(1);
        });

        it('enqueues notifications when appropriate', async () => {
            await factory.create('sequence', { name: 'OlxTracker' });
            const org = await factory.create('organization', {
                shipperSeqNum: 3 // Narvar only pushes notifications for certain customers.
            });
            const zipZone = await factory.create('udsZipZone');

            const body = await factory.create('orderRequest', {
                to_address: { zip: zipZone.zipcode }
            });

            const req = { org, body };
            const res = new MockResponse();

            await createOrderMiddleware(req, res);

            expect(res.statusCode).to.eq(201);
            expect(typeof res.data.label_base64).to.eq('string');

            const notifications = await hermod.getClient().findNotifications();
            expect(notifications).to.have.lengthOf(1);
            expect(notifications[0].request.body.estimatedDeliveryDate).not.to.eq(
                DateTime.fromISO(
                    res.data.created_date
                ).plus({ days: 4 }).toISO({ includeOffset: false })
            );
        });

        it('rejects on no eligible zip zones', async () => {
            const org = await factory.create('organization', { name: 'test' });
            const body = await factory.create('orderRequest');

            const req = { org, body };
            const res = new MockResponse();
            await expect(createOrderMiddleware(req, res)).to.be.rejectedWith(UnprocessableEntityError);
        });
    });

    describe('cancelOrderMiddleware', () => {
        it('error response with invalid id', async () => {
            const org = await factory.create('organization');
            const req = { org, params: { id: 'fake_id_123' } };
            const res = new MockResponse();

            await expect(cancelOrderMiddleware(req, res)).to.be.rejectedWith(NotFoundError);
        });

        it('update order status', async () => {
            const org = await factory.create('organization');
            const shipment = await factory.create('shipment', {
                shipper: org.shipperSeqNum,
                docs: [{ doc: { Barcode: 'UDS1234' }, vendor: 'UDS' }]
            });

            const req = { org, params: { id: shipment.tn } };
            const res = new MockResponse();

            await cancelOrderMiddleware(req, res);
            expect(res.data.cancelled_time).not.to.eq(null);
        });

        it('do not proceed for duplicated request', async () => {
            const org = await factory.create('organization');
            const shipment = await factory.create('shipment', {
                shipper: org.shipperSeqNum,
                docs: [{ doc: { Barcode: 'UDS1234' }, vendor: 'UDS' }],
                status: ORDER_STATUS.cancelled,
                cancelledAt: new Date()
            });

            const req = { org, params: { id: shipment.tn } };
            const res = new MockResponse();

            await expect(cancelOrderMiddleware(req, res)).to.be.rejectedWith(UnprocessableEntityError);
        });
    });
});
