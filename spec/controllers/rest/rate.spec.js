const { expect, factory } = require('chai');

const { getRateMiddleware } = require('../../../app/controllers/rest/rate');
const { MockResponse } = require('../../helper/mockResponse');
const { validateOrderMiddleware } = require('../../../app/controllers/rest/order');

// we expect rate middleware to be run after validateOrder middleware
// so we build this runner function to model this middleware stack
const exec = async (req, res) => {
    const next = () => 'OK';

    await validateOrderMiddleware(req, res, next);
    await getRateMiddleware(req, res);
};

describe('rate controller', () => {
    describe('getRate', () => {
        it('for a valid shipment it successfully retrieves the rate', async () => {
            await factory.create('sequence', { name: 'OlxTracker' });
            const org = await factory.create('organization');
            const zipZone = await factory.create('udsZipZone');
            const zip = zipZone.zipcode;

            const zipPrefix = zip.slice(0, 3);
            await factory.create('zoneMatrix', { prefix: zipPrefix, matrix: new Array(999).fill('1*') });
            await factory.create('rateCards', { shipperId: org.shipperSeqNum, zone: 1, weight: 3, cost: 5.00 });

            const body = await factory.create('orderRequest', { to_address: { zip } });

            const req = { org, body };
            const res = new MockResponse();

            await exec(req, res);

            expect(res.statusCode).to.eq(200);
            // 5 is the default factory cost
            expect(res.data).to.deep.eq({
                ...body,
                rate: {
                    billable_weight: 3,
                    cost: '5.00',
                    dollar_cost: '$5.00',
                    zone: 1,
                    use_dim_weight: true
                }
            });
        });

        it('for a valid shipment it successfully retrieves the rate (zone 8, weight 5 - variable rate shipper)', async () => {
            await factory.create('sequence', { name: 'OlxTracker' });
            const org = await factory.create('organization');
            const zipZone = await factory.create('udsZipZone', { zipcode: '00120' });
            const zip = zipZone.zipcode;

            const zipPrefix = zip.slice(0, 3);
            await factory.create('zoneMatrix', { prefix: zipPrefix, matrix: new Array(999).fill('8b') });
            await factory.create('rateCards', {
                shipperId: org.shipperSeqNum,
                cost: 5.00,
                zone: parseInt(8),
                weight: parseInt(5)
            });

            const body = await factory.create('orderRequest', {
                to_address: { zip },
                parcel: { weight: '5' }
            });

            const req = { org, body };
            const res = new MockResponse();

            await exec(req, res);

            expect(res.statusCode).to.eq(200);
            expect(res.data).to.deep.eq({
                ...body,
                rate: {
                    billable_weight: 5,
                    cost: '5.00',
                    dollar_cost: '$5.00',
                    zone: 8,
                    use_dim_weight: false
                }
            });
        });

        it('uses dim weight when greater than provided weight', async () => {
            await factory.create('sequence', { name: 'OlxTracker' });
            const org = await factory.create('organization');
            const zipZone = await factory.create('udsZipZone', { zipcode: '00120' });
            const zip = zipZone.zipcode;

            const zipPrefix = zip.slice(0, 3);
            await factory.create('zoneMatrix', {
                prefix: zipPrefix,
                matrix: new Array(999).fill('8b')
            });

            // dim weight (10x10x10/175=5.8 ~ 6);
            const testDims = {
                weight: '1',
                height: '10.00',
                width: '10.00',
                length: '10.00'
            };

            await factory.create('rateCards', {
                shipperId: org.shipperSeqNum,
                cost: 1.00,
                zone: parseInt(8),
                weight: parseInt(1)
            });

            await factory.create('rateCards', {
                shipperId: org.shipperSeqNum,
                cost: 10.00,
                zone: parseInt(8),
                weight: parseInt(6)
            });

            const body = await factory.create('orderRequest', {
                to_address: { zip },
                parcel: { ...testDims }
            });

            const req = { org, body };
            const res = new MockResponse();

            await exec(req, res);

            expect(res.statusCode).to.eq(200);
            expect(res.data).to.deep.eq({
                ...body,
                rate: {
                    billable_weight: 7,
                    cost: null,
                    dollar_cost: null,
                    zone: 8,
                    use_dim_weight: true
                }
            });
        });
    });
});
