const { expect, factory, request } = require('chai');
const { UnprocessableEntityError, NotFoundError, UnauthorizedError } = require('errors');

const Shipment = require('../../../app/models/olxshipment');
const { DateTime } = require('luxon');
const { getTrackingUrl } = require('../../../app/repositories/shipments');
const { ORDER_STATUS, CARRIER_NAMES } = require('../../../app/constants/carrierConstants');

const { consentWhitelistCutoff } = require('../../../app/config/index');

const getFromAddress = (args = {}) => {
    return {
        name: 'Andrew Tribone',
        address1: '12588 Florence Ave.',
        address2: '',
        city: 'Santa Fe Springs',
        state: 'CA',
        zip: '90670',
        country: 'US',
        phone: '1-800-866-0286',
        ...args
    };
};

const getToAddress = (args = {}) => {
    return {
        name: 'Jamila Small',
        address1: '174 Riverdale Ave',
        address2: 'F',
        city: 'Brooklyn',
        state: 'NY',
        zip: '11211',
        country: 'US',
        phone: '347-691-8291',
        ...args
    };
};

const getRate = (args = {}) => {
    return {
        cost: '5.00',
        dollar_cost: '$5.00',
        billable_weight: 3,
        zone: 1,
        use_dim_weight: true,
        ...args
    };
};

const getParcel = (args = {}) => {
    return {
        description: 'Clothing and Accessories',
        length: '16',
        width: '12',
        height: '2',
        weight: '0.3',
        value: '19.99',
        reference: '00008872784502755082',
        // we always expect these to be passed
        carrier: null,
        tracking_num: null,
        attributes: {},
        ...args
    };
};

describe('/service/v1', () => {
    describe('POST /order', () => {
        it('requires authentication', async () => {
            const response = await request(global.server)
                .post('/service/v1/order');

            expect(response.status).to.eq(401);
            expect(response.body).excluding('request_id').to.eql(UnauthorizedError.toJSON());
        });

        it('creates a UDS order', async () => {
            const org = await factory.create('organization');
            const zipZone = await factory.create('udsZipZone');
            const zip = zipZone.zipcode;

            await factory.create('sequence', { name: 'OlxTracker' });

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

            const response = await request(global.server)
                .post('/service/v1/order')
                .auth(org.apiId, org.apiKey)
                .send(body);

            expect(response.status).to.eq(201);

            const shipment = await Shipment.dbget();

            expect(response.body).to.deep.eql({
                tracking_number: shipment.tn,
                tracking_url: getTrackingUrl(shipment),
                shipper_name: 'Shipper Name',
                shipper_phone: '800-866-0286',
                reference_id: '62457395',
                reference_data: '62457395',
                to_address: getToAddress({ zip }),
                from_address: getFromAddress(),
                parcel: getParcel({
                    carrier: zipZone.carrier,
                    tracking_num: shipment.docs[0].doc.Barcode
                }),
                rate: getRate(),
                label_format: 'Z4x6',
                label_base64: shipment.label.base64,
                create_time: shipment.created_date.toISOString(),
                cancelled_time: null
            });

            const label = Buffer.from(response.body.label_base64, 'base64').toString('ascii');
            expect(label).to.include('JAMILA SMALL');
            expect(response.body.parcel.tracking_num.startsWith('UDS')).to.eq(true);
        });

        it('creates a LaserShip order', async () => {
            const org = await factory.create('organization');
            const zipZone = await factory.create('lasershipZipZone');
            const zip = zipZone.zipcode;

            await factory.create('sequence', { name: 'OlxTracker' });

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

            const body = await factory.create('orderRequest', {
                shipper_name: 'OneLiveX',
                to_address: { zip }
            });

            const response = await request(global.server)
                .post('/service/v1/order')
                .auth(org.apiId, org.apiKey)
                .send(body);

            expect(response.status).to.eq(201);

            const shipment = await Shipment.dbget();

            expect(response.body).to.deep.eql({
                tracking_number: shipment.tn,
                tracking_url: getTrackingUrl(shipment),
                shipper_name: 'OneLiveX',
                shipper_phone: '800-866-0286',
                reference_id: '62457395',
                reference_data: '62457395',
                to_address: getToAddress({ zip }),
                from_address: getFromAddress(),
                parcel: getParcel({
                    carrier: zipZone.carrier,
                    tracking_num: shipment.docs[0].doc.Pieces[0].LaserShipBarcode
                }),
                rate: getRate(),
                label_format: 'Z4x6',
                label_base64: shipment.label.base64,
                create_time: shipment.created_date.toISOString(),
                cancelled_time: null
            });

            const label = Buffer.from(response.body.label_base64, 'base64').toString('ascii');
            expect(label).to.include('Jamila Small');
            expect(response.body.parcel.tracking_num.startsWith('1LS')).to.eq(true);
        });

        it('creates a ParcelPrep order', async () => {
            const org = await factory.create('organization');
            const zipZone = await factory.create('parcelprepZipZone');
            const zip = zipZone.zipcode;

            await factory.create('sequence', { name: 'OlxTracker' });

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

            const referenceId = '62457395';

            const body = await factory.create('orderRequest', {
                shipper_name: 'OneLiveX',
                reference_id: referenceId,
                to_address: { zip }
            });

            const response = await request(global.server)
                .post('/service/v1/order')
                .auth(org.apiId, org.apiKey)
                .send(body);

            expect(response.status).to.eq(201);

            const shipment = await Shipment.dbget();

            expect(response.body).to.deep.eql({
                tracking_number: shipment.tn,
                tracking_url: getTrackingUrl(shipment),
                shipper_name: 'OneLiveX',
                shipper_phone: '800-866-0286',
                reference_id: referenceId,
                reference_data: '62457395',
                to_address: getToAddress({ zip }),
                from_address: getFromAddress(),
                parcel: getParcel({
                    carrier: zipZone.carrier,
                    tracking_num: shipment.docs[0].doc.trackingNumber
                }),
                rate: getRate(),
                label_format: 'Z4x6',
                label_base64: shipment.label.base64,
                create_time: shipment.created_date.toISOString(),
                cancelled_time: null
            });

            const label = Buffer.from(response.body.label_base64, 'base64').toString('ascii');
            expect(label).to.include('Jamila Small');
            expect(label).to.include('USPS PRIORITY MAIL');
        });

        it('creates an OnTrac order', async () => {
            const org = await factory.create('organization', { name: 'test', terminalProviderOrder: [CARRIER_NAMES.ontrac] });
            const zipZone = await factory.create('ontracZipZone');
            const zip = zipZone.zipcode;

            await factory.create('sequence', { name: 'OlxTracker' });

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

            const body = await factory.create('orderRequest', {
                to_address: { zip },
                shipper_name: 'OneLiveX'
            });

            const response = await request(global.server)
                .post('/service/v1/order')
                .auth(org.apiId, org.apiKey)
                .send(body);

            expect(response.status).to.eq(201);

            const shipment = await Shipment.dbget();

            expect(response.body).to.deep.eql({
                tracking_number: shipment.tn,
                tracking_url: getTrackingUrl(shipment),
                shipper_name: 'OneLiveX',
                shipper_phone: '800-866-0286',
                reference_id: '62457395',
                reference_data: '62457395',
                to_address: getToAddress({ zip }),
                from_address: getFromAddress(),
                parcel: getParcel({
                    carrier: zipZone.carrier,
                    tracking_num: shipment.docs[0].doc.Tracking
                }),
                rate: getRate(),
                label_format: 'Z4x6',
                label_base64: shipment.label.base64,
                create_time: shipment.created_date.toISOString(),
                cancelled_time: null
            });

            const label = Buffer.from(response.body.label_base64, 'base64').toString('ascii');
            expect(label).to.include('JAMILA SMALL');
            expect(response.body.parcel.tracking_num.startsWith('D')).to.eq(true);
        });

        it.skip('creates a DHL eCommerce order', async () => {
            const org = await factory.create('organization', { name: 'test', terminalProviderOrder: [CARRIER_NAMES.dhlecommerce] });
            const zipZone = await factory.create('dhlecommerceZipZone');
            const zip = zipZone.zipcode;

            await factory.create('sequence', { name: 'OlxTracker' });

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

            const body = await factory.create('orderRequest', {
                to_address: { zip },
                shipper_name: 'OneLiveX'
            });

            const response = await request(global.server)
                .post('/service/v1/order')
                .auth(org.apiId, org.apiKey)
                .send(body);

            expect(response.status).to.eq(201);

            const shipment = await Shipment.dbget();

            expect(response.body).to.deep.eql({
                tracking_number: shipment.tn,
                tracking_url: getTrackingUrl(shipment),
                shipper_name: 'OneLiveX',
                shipper_phone: '800-866-0286',
                reference_id: '62457395',
                reference_data: '62457395',
                to_address: getToAddress({ zip }),
                from_address: getFromAddress(),
                parcel: getParcel({
                    carrier: zipZone.carrier,
                    tracking_num: shipment.docs[0].doc.trackingNumber
                }),
                rate: getRate(),
                label_format: 'Z4x6',
                label_base64: shipment.label.base64,
                create_time: shipment.created_date.toISOString(),
                cancelled_time: null
            });

            const label = Buffer.from(response.body.label_base64, 'base64').toString('ascii');
            expect(label).to.include('Jamila Small');
            expect(response.body.parcel.tracking_num.startsWith('420')).to.eq(true);
        });

        it('creates an LSO order', async () => {
            const org = await factory.create('organization', { name: 'test', terminalProviderOrder: [CARRIER_NAMES.lso] });
            const zipZone = await factory.create('lsoZipZone');
            const zip = zipZone.zipcode;

            await factory.create('sequence', { name: 'OlxTracker' });

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

            const body = await factory.create('orderRequest', {
                to_address: { zip },
                shipper_name: 'OneLiveX'
            });

            const response = await request(global.server)
                .post('/service/v1/order')
                .auth(org.apiId, org.apiKey)
                .send(body);

            expect(response.status).to.eq(201);

            const shipment = await Shipment.dbget();

            expect(response.body).to.deep.eql({
                tracking_number: shipment.tn,
                tracking_url: getTrackingUrl(shipment),
                shipper_name: 'OneLiveX',
                shipper_phone: '800-866-0286',
                reference_id: '62457395',
                reference_data: '62457395',
                to_address: getToAddress({ zip }),
                from_address: getFromAddress(),
                parcel: getParcel({
                    carrier: zipZone.carrier,
                    tracking_num: shipment.docs[0].doc.trackingNumber
                }),
                rate: getRate(),
                label_format: 'Z4x6',
                label_base64: shipment.label.base64,
                create_time: shipment.created_date.toISOString(),
                cancelled_time: null
            });

            const label = Buffer.from(response.body.label_base64, 'base64').toString('ascii');
            expect(label).to.include('JAMILA SMALL');
            expect(response.body.parcel.tracking_num.startsWith('Z')).to.eq(true);
        });

        it('creates an LSO / FashionNova order', async () => {
            const org = await factory.create('organization', { name: 'FashionNova', terminalProviderOrder: [CARRIER_NAMES.lso] });
            const zipZone = await factory.create('lsoZipZone');
            const zip = zipZone.zipcode;

            await factory.create('sequence', { name: 'OlxTracker' });

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

            const body = await factory.create('orderRequest', {
                to_address: { zip },
                shipper_name: 'OneLiveX'
            });

            const response = await request(global.server)
                .post('/service/v1/order')
                .auth(org.apiId, org.apiKey)
                .send(body);

            expect(response.status).to.eq(201);

            const shipment = await Shipment.dbget();

            expect(response.body).to.deep.eql({
                tracking_number: shipment.tn,
                tracking_url: getTrackingUrl(shipment),
                shipper_name: 'OneLiveX',
                shipper_phone: '800-866-0286',
                reference_id: '62457395',
                reference_data: '62457395',
                to_address: getToAddress({ zip }),
                from_address: getFromAddress(),
                parcel: getParcel({
                    carrier: zipZone.carrier,
                    tracking_num: shipment.docs[0].doc.trackingNumber
                }),
                rate: getRate(),
                label_format: 'Z4x6',
                label_base64: shipment.label.base64,
                create_time: shipment.created_date.toISOString(),
                cancelled_time: null
            });

            const label = Buffer.from(response.body.label_base64, 'base64').toString('ascii');
            expect(label).to.include('JAMILA SMALL');
            expect(response.body.parcel.tracking_num.startsWith('Z')).to.eq(true);
        });

        it('creates an LSO tobacco order', async () => {
            const org = await factory.create('organization', {
                name: 'test',
                settings: { tobacco: true },
                terminalProviderOrder: [CARRIER_NAMES.lso]
            });
            const zipZone = await factory.create('lsoZipZoneVape');
            const zip = zipZone.zipcode;

            await factory.create('sequence', { name: 'OlxTracker' });

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

            const body = await factory.create('orderRequest', {
                to_address: { zip },
                shipper_name: 'OneLiveX'
            });

            const response = await request(global.server)
                .post('/service/v1/order')
                .auth(org.apiId, org.apiKey)
                .send(body);

            expect(response.status).to.eq(201);

            const shipment = await Shipment.dbget();
            expect(response.body).to.eql({
                tracking_number: shipment.tn,
                tracking_url: getTrackingUrl(shipment),
                shipper_name: 'OneLiveX',
                shipper_phone: '800-866-0286',
                reference_id: '62457395',
                reference_data: '62457395',
                to_address: getToAddress({ zip }),
                from_address: getFromAddress(),
                parcel: getParcel({
                    carrier: zipZone.carrier,
                    tracking_num: shipment.docs[0].doc.trackingNumber,
                    attributes: {
                        delivery_confirmation: '21_signature_required',
                        substance: 'tobacco'
                    }
                }),
                rate: getRate(),
                label_format: 'Z4x6',
                label_base64: shipment.label.base64,
                create_time: shipment.created_date.toISOString(),
                cancelled_time: null
            });

            const label = Buffer.from(response.body.label_base64, 'base64').toString('ascii');
            expect(label).to.include('JAMILA SMALL');
            expect(label).to.include(zipZone.sortcode);
            expect(response.body.parcel.tracking_num.startsWith('Z')).to.eq(true);
        });

        it('creates a Hackbarth order', async () => {
            const org = await factory.create('organization', { settings: { tobacco: true }, terminalProviderOrder: [CARRIER_NAMES.hackbarth] });
            const zipZone = await factory.create('hackbarthZipZone');
            const zip = zipZone.zipcode;

            await factory.create('sequence', { name: 'OlxTracker' });

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

            const response = await request(global.server)
                .post('/service/v1/order')
                .auth(org.apiId, org.apiKey)
                .send(body);

            expect(response.status).to.eq(201);

            const shipment = await Shipment.dbget();

            expect(response.body).to.deep.eql({
                tracking_number: shipment.tn,
                tracking_url: getTrackingUrl(shipment),
                shipper_name: 'Shipper Name',
                shipper_phone: '800-866-0286',
                reference_id: '62457395',
                reference_data: '62457395',
                to_address: getToAddress({ zip }),
                from_address: getFromAddress(),
                parcel: getParcel({
                    carrier: zipZone.carrier,
                    tracking_num: shipment.docs[0].doc.trackingNumber,
                    attributes: {
                        delivery_confirmation: '21_signature_required',
                        substance: 'tobacco'
                    }
                }),
                rate: getRate(),
                label_format: 'Z4x6',
                label_base64: shipment.label.base64,
                create_time: shipment.created_date.toISOString(),
                cancelled_time: null
            });

            const label = Buffer.from(response.body.label_base64, 'base64').toString('ascii');
            expect(label).to.include('Jamila Small');
        });

        context('creates Concise order for', () => {
            it('Deliver-it', async () => {
                const org = await factory.create('organization', { settings: { tobacco: true }, terminalProviderOrder: [CARRIER_NAMES.deliverIt] });
                const zipZone = await factory.create('deliverItZipZone');
                const zip = zipZone.zipcode;

                await factory.create('sequence', { name: 'OlxTracker' });

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

                const body = await factory.create('conciseRequest', { to_address: { zip } });

                const response = await request(global.server)
                    .post('/service/v1/order')
                    .auth(org.apiId, org.apiKey)
                    .send(body);

                expect(response.status).to.eq(201);

                const shipment = await Shipment.dbget();

                expect(response.body).to.deep.eql({
                    tracking_number: shipment.tn,
                    tracking_url: getTrackingUrl(shipment),
                    shipper_name: 'Shipper Name',
                    shipper_phone: '800-866-0286',
                    reference_id: '62457395',
                    reference_data: '62457395',
                    to_address: getToAddress({ zip }),
                    from_address: getFromAddress(),
                    parcel: getParcel({
                        carrier: zipZone.carrier,
                        tracking_num: shipment.docs[0].doc.trackingNumber,
                        attributes: {
                            delivery_confirmation: '21_signature_required',
                            substance: 'tobacco'
                        }
                    }),
                    rate: getRate(),
                    label_format: 'P4x6',
                    label_base64: shipment.label.base64,
                    create_time: shipment.created_date.toISOString(),
                    cancelled_time: null
                });
            });

            it('ProMed', async () => {
                const org = await factory.create('organization', { settings: { tobacco: true }, terminalProviderOrder: [CARRIER_NAMES.promed] });
                const zipZone = await factory.create('promedZipZone');
                const zip = zipZone.zipcode;

                await factory.create('sequence', { name: 'OlxTracker' });

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

                const body = await factory.create('conciseRequest', { to_address: { zip } });

                const response = await request(global.server)
                    .post('/service/v1/order')
                    .auth(org.apiId, org.apiKey)
                    .send(body);

                expect(response.status).to.eq(201);
                const shipment = await Shipment.dbget();

                expect(response.body).to.deep.eql({
                    tracking_number: shipment.tn,
                    tracking_url: getTrackingUrl(shipment),
                    shipper_name: 'Shipper Name',
                    shipper_phone: '800-866-0286',
                    reference_id: '62457395',
                    reference_data: '62457395',
                    to_address: getToAddress({ zip }),
                    from_address: getFromAddress(),
                    parcel: getParcel({
                        carrier: zipZone.carrier,
                        tracking_num: shipment.docs[0].doc.trackingNumber,
                        attributes: {
                            delivery_confirmation: '21_signature_required',
                            substance: 'tobacco'
                        }
                    }),
                    rate: getRate(),
                    label_format: 'P4x6',
                    label_base64: shipment.label.base64,
                    create_time: shipment.created_date.toISOString(),
                    cancelled_time: null
                });
            });

            it('Sonic', async () => {
                const org = await factory.create('organization', { settings: { tobacco: true }, terminalProviderOrder: [CARRIER_NAMES.sonic] });
                const zipZone = await factory.create('sonicZipZone');
                const zip = zipZone.zipcode;

                await factory.create('sequence', { name: 'OlxTracker' });

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

                const body = await factory.create('conciseRequest', { to_address: { zip } });

                const response = await request(global.server)
                    .post('/service/v1/order')
                    .auth(org.apiId, org.apiKey)
                    .send(body);

                expect(response.status).to.eq(201);

                const shipment = await Shipment.dbget();

                expect(response.body).to.deep.eql({
                    tracking_number: shipment.tn,
                    tracking_url: getTrackingUrl(shipment),
                    shipper_name: 'Shipper Name',
                    shipper_phone: '800-866-0286',
                    reference_id: '62457395',
                    reference_data: '62457395',
                    to_address: getToAddress({ zip }),
                    from_address: getFromAddress(),
                    parcel: getParcel({
                        carrier: zipZone.carrier,
                        tracking_num: shipment.docs[0].doc.trackingNumber,
                        attributes: {
                            delivery_confirmation: '21_signature_required',
                            substance: 'tobacco'
                        }
                    }),
                    rate: getRate(),
                    label_format: 'P4x6',
                    label_base64: shipment.label.base64,
                    create_time: shipment.created_date.toISOString(),
                    cancelled_time: null
                });
            });

            it('Next Day Express', async () => {
                const org = await factory.create('organization', { settings: { tobacco: true }, terminalProviderOrder: [CARRIER_NAMES.nextDayExpress] });
                const zipZone = await factory.create('nextdayexpressZipZone');
                const zip = zipZone.zipcode;

                await factory.create('sequence', { name: 'OlxTracker' });

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

                const body = await factory.create('conciseRequest', { to_address: { zip } });

                const response = await request(global.server)
                    .post('/service/v1/order')
                    .auth(org.apiId, org.apiKey)
                    .send(body);

                expect(response.status).to.eq(201);

                const shipment = await Shipment.dbget();

                expect(response.body).to.deep.eql({
                    tracking_number: shipment.tn,
                    tracking_url: getTrackingUrl(shipment),
                    shipper_name: 'Shipper Name',
                    shipper_phone: '800-866-0286',
                    reference_id: '62457395',
                    reference_data: '62457395',
                    to_address: getToAddress({ zip }),
                    from_address: getFromAddress(),
                    parcel: getParcel({
                        carrier: zipZone.carrier,
                        tracking_num: shipment.docs[0].doc.trackingNumber,
                        attributes: {
                            delivery_confirmation: '21_signature_required',
                            substance: 'tobacco'
                        }
                    }),
                    rate: getRate(),
                    label_format: 'P4x6',
                    label_base64: shipment.label.base64,
                    create_time: shipment.created_date.toISOString(),
                    cancelled_time: null
                });
            });

            it('CL Logistics', async () => {
                const org = await factory.create('organization', { settings: { tobacco: true }, terminalProviderOrder: [CARRIER_NAMES.cSLogistics] });
                const zipZone = await factory.create('cllogisticsZipZone');
                const zip = zipZone.zipcode;

                await factory.create('sequence', { name: 'OlxTracker' });

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

                const body = await factory.create('conciseRequest', { to_address: { zip } });

                const response = await request(global.server)
                    .post('/service/v1/order')
                    .auth(org.apiId, org.apiKey)
                    .send(body);

                expect(response.status).to.eq(201);

                const shipment = await Shipment.dbget();

                expect(response.body).to.deep.eql({
                    tracking_number: shipment.tn,
                    tracking_url: getTrackingUrl(shipment),
                    shipper_name: 'Shipper Name',
                    shipper_phone: '800-866-0286',
                    reference_id: '62457395',
                    reference_data: '62457395',
                    to_address: getToAddress({ zip }),
                    from_address: getFromAddress(),
                    parcel: getParcel({
                        carrier: zipZone.carrier,
                        tracking_num: shipment.docs[0].doc.trackingNumber,
                        attributes: {
                            delivery_confirmation: '21_signature_required',
                            substance: 'tobacco'
                        }
                    }),
                    rate: getRate(),
                    label_format: 'P4x6',
                    label_base64: shipment.label.base64,
                    create_time: shipment.created_date.toISOString(),
                    cancelled_time: null
                });
            });

            it('Mercury', async () => {
                const org = await factory.create('organization', { settings: { tobacco: true }, terminalProviderOrder: [CARRIER_NAMES.mercury] });
                const zipZone = await factory.create('mercuryZipZone');
                const zip = zipZone.zipcode;

                await factory.create('sequence', { name: 'OlxTracker' });

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

                const body = await factory.create('conciseRequest', { to_address: { zip } });

                const response = await request(global.server)
                    .post('/service/v1/order')
                    .auth(org.apiId, org.apiKey)
                    .send(body);

                expect(response.status).to.eq(201);

                const shipment = await Shipment.dbget();

                expect(response.body).to.deep.eql({
                    tracking_number: shipment.tn,
                    tracking_url: getTrackingUrl(shipment),
                    shipper_name: 'Shipper Name',
                    shipper_phone: '800-866-0286',
                    reference_id: '62457395',
                    reference_data: '62457395',
                    to_address: getToAddress({ zip }),
                    from_address: getFromAddress(),
                    parcel: getParcel({
                        carrier: zipZone.carrier,
                        tracking_num: shipment.docs[0].doc.trackingNumber,
                        attributes: {
                            delivery_confirmation: '21_signature_required',
                            substance: 'tobacco'
                        }
                    }),
                    rate: getRate(),
                    label_format: 'P4x6',
                    label_base64: shipment.label.base64,
                    create_time: shipment.created_date.toISOString(),
                    cancelled_time: null
                });
            });

            it('QuickCourier', async () => {
                const org = await factory.create('organization', { settings: { tobacco: true }, terminalProviderOrder: [CARRIER_NAMES.quickCourier] });
                const zipZone = await factory.create('quickCourierZipZone');
                const zip = zipZone.zipcode;

                await factory.create('sequence', { name: 'OlxTracker' });

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

                const body = await factory.create('conciseRequest', { to_address: { zip } });

                const response = await request(global.server)
                    .post('/service/v1/order')
                    .auth(org.apiId, org.apiKey)
                    .send(body);

                expect(response.status).to.eq(201);

                const shipment = await Shipment.dbget();

                expect(response.body).to.eql({
                    tracking_number: shipment.tn,
                    tracking_url: getTrackingUrl(shipment),
                    shipper_name: 'Shipper Name',
                    shipper_phone: '800-866-0286',
                    reference_id: '62457395',
                    reference_data: '62457395',
                    to_address: getToAddress({ zip }),
                    from_address: getFromAddress(),
                    parcel: getParcel({
                        carrier: zipZone.carrier,
                        tracking_num: shipment.docs[0].doc.trackingNumber,
                        attributes: {
                            delivery_confirmation: '21_signature_required',
                            substance: 'tobacco'
                        }
                    }),
                    rate: getRate(),
                    label_format: 'P4x6',
                    label_base64: shipment.label.base64,
                    create_time: shipment.created_date.toISOString(),
                    cancelled_time: null
                });
            });

            it('capitalExpress', async () => {
                const org = await factory.create('organization', { settings: { tobacco: true }, terminalProviderOrder: [CARRIER_NAMES.capitalExpress] });
                const zipZone = await factory.create('capitalExpressZipZone');
                const zip = zipZone.zipcode;

                await factory.create('sequence', { name: 'OlxTracker' });

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

                const body = await factory.create('conciseRequest', { to_address: { zip } });

                const response = await request(global.server)
                    .post('/service/v1/order')
                    .auth(org.apiId, org.apiKey)
                    .send(body);

                expect(response.status).to.eq(201);
                const shipment = await Shipment.dbget();

                expect(response.body).to.deep.eql({
                    tracking_number: shipment.tn,
                    tracking_url: getTrackingUrl(shipment),
                    shipper_name: 'Shipper Name',
                    shipper_phone: '800-866-0286',
                    reference_id: '62457395',
                    reference_data: '62457395',
                    to_address: getToAddress({ zip }),
                    from_address: getFromAddress(),
                    parcel: getParcel({
                        carrier: zipZone.carrier,
                        tracking_num: shipment.docs[0].doc.trackingNumber,
                        attributes: {
                            delivery_confirmation: '21_signature_required',
                            substance: 'tobacco'
                        }
                    }),
                    rate: getRate(),
                    label_format: 'P4x6',
                    label_base64: shipment.label.base64,
                    create_time: shipment.created_date.toISOString(),
                    cancelled_time: null
                });
            });

            it('JST', async () => {
                const org = await factory.create('organization', { settings: { tobacco: true }, terminalProviderOrder: [CARRIER_NAMES.jst] });
                const zipZone = await factory.create('jstZipZone');
                const zip = zipZone.zipcode;

                await factory.create('sequence', { name: 'OlxTracker' });

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

                const body = await factory.create('conciseRequest', { to_address: { zip } });

                const response = await request(global.server)
                    .post('/service/v1/order')
                    .auth(org.apiId, org.apiKey)
                    .send(body);

                expect(response.status).to.eq(201);
                const shipment = await Shipment.dbget();

                expect(response.body).to.deep.eql({
                    tracking_number: shipment.tn,
                    tracking_url: getTrackingUrl(shipment),
                    shipper_name: 'Shipper Name',
                    shipper_phone: '800-866-0286',
                    reference_id: '62457395',
                    reference_data: '62457395',
                    to_address: getToAddress({ zip }),
                    from_address: getFromAddress(),
                    parcel: getParcel({
                        carrier: zipZone.carrier,
                        tracking_num: shipment.docs[0].doc.trackingNumber,
                        attributes: {
                            delivery_confirmation: '21_signature_required',
                            substance: 'tobacco'
                        }
                    }),
                    rate: getRate(),
                    label_format: 'P4x6',
                    label_base64: shipment.label.base64,
                    create_time: shipment.created_date.toISOString(),
                    cancelled_time: null
                });
            });

            it('MichaelsMessanger', async () => {
                const org = await factory.create('organization', { settings: { tobacco: true }, terminalProviderOrder: [CARRIER_NAMES.michaelsMessengerService] });
                const zipZone = await factory.create('michaelsMessengerZipZone');
                const zip = zipZone.zipcode;

                await factory.create('sequence', { name: 'OlxTracker' });

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

                const body = await factory.create('conciseRequest', { to_address: { zip } });

                const response = await request(global.server)
                    .post('/service/v1/order')
                    .auth(org.apiId, org.apiKey)
                    .send(body);

                expect(response.status).to.eq(201);
                const shipment = await Shipment.dbget();

                expect(response.body).to.deep.eql({
                    tracking_number: shipment.tn,
                    tracking_url: getTrackingUrl(shipment),
                    shipper_name: 'Shipper Name',
                    shipper_phone: '800-866-0286',
                    reference_id: '62457395',
                    reference_data: '62457395',
                    to_address: getToAddress({ zip }),
                    from_address: getFromAddress(),
                    parcel: getParcel({
                        carrier: zipZone.carrier,
                        tracking_num: shipment.docs[0].doc.trackingNumber,
                        attributes: {
                            delivery_confirmation: '21_signature_required',
                            substance: 'tobacco'
                        }
                    }),
                    rate: getRate(),
                    label_format: 'P4x6',
                    label_base64: shipment.label.base64,
                    create_time: shipment.created_date.toISOString(),
                    cancelled_time: null
                });
            });

            it('veterans', async () => {
                const org = await factory.create('organization', { settings: { tobacco: true }, terminalProviderOrder: [CARRIER_NAMES.veterans] });
                const zipZone = await factory.create('veteransZipZone');
                const zip = zipZone.zipcode;

                await factory.create('sequence', { name: 'OlxTracker' });

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

                const body = await factory.create('conciseRequest', { to_address: { zip } });

                const response = await request(global.server)
                    .post('/service/v1/order')
                    .auth(org.apiId, org.apiKey)
                    .send(body);

                expect(response.status).to.eq(201);
                const shipment = await Shipment.dbget();

                expect(response.body).to.eql({
                    tracking_number: shipment.tn,
                    tracking_url: getTrackingUrl(shipment),
                    shipper_name: 'Shipper Name',
                    shipper_phone: '800-866-0286',
                    reference_id: '62457395',
                    reference_data: '62457395',
                    to_address: getToAddress({ zip }),
                    from_address: getFromAddress(),
                    parcel: getParcel({
                        carrier: zipZone.carrier,
                        tracking_num: shipment.docs[0].doc.trackingNumber,
                        attributes: {
                            delivery_confirmation: '21_signature_required',
                            substance: 'tobacco'
                        }
                    }),
                    rate: getRate(),
                    label_format: 'P4x6',
                    label_base64: shipment.label.base64,
                    create_time: shipment.created_date.toISOString(),
                    cancelled_time: null
                });
            });

            it.skip('Jet', async () => {
                const org = await factory.create('organization', { settings: { tobacco: true }, terminalProviderOrder: [CARRIER_NAMES.jet] });
                const zipZone = await factory.create('jetZipZone');
                const zip = zipZone.zipcode;

                await factory.create('sequence', { name: 'OlxTracker' });

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

                const body = await factory.create('conciseRequest', { to_address: { zip } });

                const response = await request(global.server)
                    .post('/service/v1/order')
                    .auth(org.apiId, org.apiKey)
                    .send(body);

                expect(response.status).to.eq(201);
                const shipment = await Shipment.dbget();

                expect(response.body).to.eql({
                    tracking_number: shipment.tn,
                    tracking_url: getTrackingUrl(shipment),
                    shipper_name: 'Shipper Name',
                    shipper_phone: '800-866-0286',
                    reference_id: '62457395',
                    reference_data: '62457395',
                    to_address: getToAddress({ zip }),
                    from_address: getFromAddress(),
                    parcel: getParcel({
                        carrier: zipZone.carrier,
                        tracking_num: shipment.docs[0].doc.trackingNumber,
                        attributes: {
                            delivery_confirmation: '21_signature_required',
                            substance: 'tobacco'
                        }
                    }),
                    rate: getRate(),
                    label_format: 'P4x6',
                    label_base64: shipment.label.base64,
                    create_time: shipment.created_date.toISOString(),
                    cancelled_time: null
                });
            });

            it('zipExpress', async () => {
                const org = await factory.create('organization', { settings: { tobacco: true }, terminalProviderOrder: [CARRIER_NAMES.zipExpress] });
                const zipZone = await factory.create('zipExpressZipZone');
                const zip = zipZone.zipcode;

                await factory.create('sequence', { name: 'OlxTracker' });

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

                const body = await factory.create('conciseRequest', { to_address: { zip } });

                const response = await request(global.server)
                    .post('/service/v1/order')
                    .auth(org.apiId, org.apiKey)
                    .send(body);

                expect(response.status).to.eq(201);
                const shipment = await Shipment.dbget();

                expect(response.body).to.eql({
                    tracking_number: shipment.tn,
                    tracking_url: getTrackingUrl(shipment),
                    shipper_name: 'Shipper Name',
                    shipper_phone: '800-866-0286',
                    reference_id: '62457395',
                    reference_data: '62457395',
                    to_address: getToAddress({ zip }),
                    from_address: getFromAddress(),
                    parcel: getParcel({
                        carrier: zipZone.carrier,
                        tracking_num: shipment.docs[0].doc.trackingNumber,
                        attributes: {
                            delivery_confirmation: '21_signature_required',
                            substance: 'tobacco'
                        }
                    }),
                    rate: getRate(),
                    label_format: 'P4x6',
                    label_base64: shipment.label.base64,
                    create_time: shipment.created_date.toISOString(),
                    cancelled_time: null
                });
            });
        });

        it('creates a pillow logistics order', async () => {
            await factory.create('sequence', { name: 'DispatchScience' });
            const org = await factory.create('organization', { settings: { tobacco: true }, terminalProviderOrder: [CARRIER_NAMES.pillowLogistics] });
            const zipZone = await factory.create('pillowZipZone');
            const pillowPhone = '317-286-0733'; // phone requested for test use with pillow
            await factory.create('pillowAuth');

            await factory.create('sequence', { name: 'OlxTracker' });

            // concise request but uses pillowLogistics credentials
            const body = await factory.create('conciseRequest', { label_format: 'Z4x6' });
            body.to_address.phone = pillowPhone;
            body.from_address.phone = pillowPhone;
            body.to_address.zip = zipZone.zipcode;

            const zipPrefix = zipZone.zipcode.slice(0, 3);
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

            const response = await request(global.server)
                .post('/service/v1/order')
                .auth(org.apiId, org.apiKey)
                .send(body);

            expect(response.status).to.eq(201);
            const shipment = await Shipment.dbget();

            expect(response.body).to.eql({
                tracking_number: shipment.tn,
                tracking_url: getTrackingUrl(shipment),
                shipper_name: 'Shipper Name',
                shipper_phone: '800-866-0286',
                reference_id: '62457395',
                reference_data: '62457395',
                to_address: {
                    name: 'Jamila Small',
                    address1: '174 Riverdale Ave',
                    address2: 'F',
                    city: 'Brooklyn',
                    state: 'NY',
                    zip: zipZone.zipcode,
                    country: 'US',
                    phone: pillowPhone
                },
                from_address: {
                    name: 'Andrew Tribone',
                    address1: '12588 Florence Ave.',
                    address2: '',
                    city: 'Santa Fe Springs',
                    state: 'CA',
                    zip: '90670',
                    country: 'US',
                    phone: pillowPhone
                },
                parcel: {
                    description: 'Clothing and Accessories',
                    length: '16',
                    width: '12',
                    height: '2',
                    weight: '0.3',
                    value: '19.99',
                    reference: '00008872784502755082',
                    carrier: zipZone.carrier,
                    tracking_num: shipment.docs[0].doc.trackingNumber,
                    attributes: {
                        substance: 'tobacco',
                        delivery_confirmation: '21_signature_required'
                    }
                },
                rate: getRate(),
                label_format: 'Z4x6',
                label_base64: shipment.label.base64,
                create_time: shipment.created_date.toISOString(),
                cancelled_time: null
            });
        });

        it.skip('creates an expeditedDelivery order', async () => {
            await factory.create('sequence', { name: 'DispatchScience', start: 10 });
            const org = await factory.create('organization', { settings: { tobacco: true }, terminalProviderOrder: [CARRIER_NAMES.expeditedDelivery] });
            const zipZone = await factory.create('expeditedDeliveryZipZone');

            await factory.create('expeditedDeliveryAuth');

            await factory.create('sequence', { name: 'OlxTracker' });

            const body = await factory.create('conciseRequest', { label_format: 'Z4x6' });

            request.to_address.zip = zipZone.zipcode;

            const zipPrefix = zipZone.zipcode.slice(0, 3);
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

            const response = await request(global.server)
                .post('/service/v1/order')
                .auth(org.apiId, org.apiKey)
                .send(body);

            expect(response.status).to.eq(201);
            const shipment = await Shipment.dbget();

            expect(response.body).to.eql({
                tracking_number: shipment.tn,
                tracking_url: getTrackingUrl(shipment),
                shipper_name: 'Shipper Name',
                shipper_phone: '800-866-0286',
                reference_id: '62457395',
                reference_data: '62457395',
                to_address: {
                    name: 'Jamila Small',
                    address1: '174 Riverdale Ave',
                    address2: 'F',
                    city: 'Brooklyn',
                    state: 'NY',
                    zip: zipZone.zipcode,
                    country: 'US',
                    phone: '347-691-8291'
                },
                from_address: {
                    name: 'Andrew Tribone',
                    address1: '12588 Florence Ave.',
                    address2: '',
                    city: 'Santa Fe Springs',
                    state: 'CA',
                    zip: '90670',
                    country: 'US',
                    phone: '1-800-866-0286'
                },
                parcel: {
                    description: 'Clothing and Accessories',
                    length: '16',
                    width: '12',
                    height: '2',
                    weight: '0.3',
                    value: '19.99',
                    reference: '00008872784502755082',
                    carrier: zipZone.carrier,
                    tracking_num: shipment.docs[0].doc.trackingNumber,
                    attributes: {
                        substance: 'tobacco',
                        delivery_confirmation: '21_signature_required'
                    }
                },
                rate: getRate(),
                label_format: 'Z4x6',
                label_base64: shipment.label.base64,
                create_time: shipment.created_date.toISOString(),
                cancelled_time: null
            });
        });

        it('creates an Axlehire order', async () => {
            const org = await factory.create('organization', { name: 'FashionNova', terminalProviderOrder: [CARRIER_NAMES.axlehire] });
            const zipZone = await factory.create('axlehireZipZone');
            const zip = zipZone.zipcode;

            await factory.create('sequence', { name: 'OlxTracker' });

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

            const referenceId = '62457395';

            const body = await factory.create('orderRequest', {
                shipper_name: 'OneLiveX',
                reference_id: referenceId,
                to_address: { zip }
            });
            const response = await request(global.server)
                .post('/service/v1/order')
                .auth(org.apiId, org.apiKey)
                .send(body);

            expect(response.status).to.eq(201);

            const shipment = await Shipment.dbget();

            expect(response.body).to.deep.eql({
                tracking_number: shipment.tn,
                tracking_url: getTrackingUrl(shipment),
                shipper_name: 'OneLiveX',
                shipper_phone: '800-866-0286',
                reference_id: referenceId,
                reference_data: '62457395',
                to_address: getToAddress({ zip }),
                from_address: getFromAddress(),
                parcel: getParcel({
                    carrier: zipZone.carrier,
                    tracking_num: shipment.docs[0].doc.trackingNumber
                }),
                rate: getRate(),
                label_format: 'Z4x6',
                label_base64: shipment.label.base64,
                create_time: shipment.created_date.toISOString(),
                cancelled_time: null
            });

            const label = Buffer.from(response.body.label_base64, 'base64').toString('ascii');
            expect(label).to.include('Jamila Small');
        });

        it('creates a stat order', async () => {
            const org = await factory.create('organization', { settings: { tobacco: true }, terminalProviderOrder: [CARRIER_NAMES.stat] });
            const zipZone = await factory.create('statZipZone');
            const zip = zipZone.zipcode;

            await factory.create('sequence', { name: 'OlxTracker' });

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

            const body = await factory.create('conciseRequest', { to_address: { zip } });

            const response = await request(global.server)
                .post('/service/v1/order')
                .auth(org.apiId, org.apiKey)
                .send(body);

            expect(response.status).to.eq(201);
            const shipment = await Shipment.dbget();

            expect(response.body).to.deep.eql({
                tracking_number: shipment.tn,
                tracking_url: getTrackingUrl(shipment),
                shipper_name: 'Shipper Name',
                shipper_phone: '800-866-0286',
                reference_id: '62457395',
                reference_data: '62457395',
                to_address: getToAddress({ zip }),
                from_address: getFromAddress(),
                parcel: getParcel({
                    carrier: zipZone.carrier,
                    tracking_num: shipment.docs[0].doc.trackingNumber,
                    attributes: {
                        delivery_confirmation: '21_signature_required',
                        substance: 'tobacco'
                    }
                }),
                rate: getRate(),
                label_format: 'P4x6',
                label_base64: shipment.label.base64,
                create_time: shipment.created_date.toISOString(),
                cancelled_time: null
            });
        });

        it('disallows 0 weight', async () => {
            const org = await factory.create('organization');
            const zipZone = await factory.create('lasershipZipZone');
            const zip = zipZone.zipcode;

            await factory.create('sequence', { name: 'OlxTracker' });

            const body = await factory.create('orderRequest', {
                shipper_name: 'OneLiveX',
                to_address: { zip },
                parcel: { weight: '0' }
            });

            const response = await request(global.server)
                .post('/service/v1/order')
                .auth(org.apiId, org.apiKey)
                .send(body);

            expect(response.status).to.eq(422);
            expect(response.body.error_fields).to.eql([{
                message: '"weight" must be greater than 0',
                name: 'parcel.weight'
            }]);
        });

        it('returns 401 if the organization was created after the cuttoff and has not consented', async () => {
            const org = await factory.create('organization',
                {
                    createdAt: DateTime.fromISO(consentWhitelistCutoff).plus({ days: 10 }).toISO(),
                    consent: {},
                    terminalProviderOrder: [CARRIER_NAMES.axlehire]
                });

            const zipZone = await factory.create('axlehireZipZone');
            const zip = zipZone.zipcode;

            const referenceId = '62457395';

            const body = await factory.create('orderRequest', {
                shipper_name: 'OneLiveX',
                reference_id: referenceId,
                to_address: { zip }
            });

            const response = await request(global.server)
                .post('/service/v1/order')
                .auth(org.apiId, org.apiKey)
                .send(body);

            expect(response.status).to.eq(401);
            expect(response.body.error_msg).to.eq('Please log into the X Delivery Dashboard to accept the Terms of Service :  https://account.staging.xdelivery.ai');
        });

        it('returns 201 if the organization before the cuttoff and has not consented', async () => {
            const org = await factory.create('organization', {
                consent: {},
                createdAt: DateTime.fromISO(consentWhitelistCutoff).minus({ days: 60 }).toISO()
            });

            const zipZone = await factory.create('udsZipZone');
            const zip = zipZone.zipcode;

            await factory.create('sequence', { name: 'OlxTracker' });

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

            const response = await request(global.server)
                .post('/service/v1/order')
                .auth(org.apiId, org.apiKey)
                .send(body);

            expect(response.status).to.eq(201);
        });

        it('returns 201 if the organization is after the cutoff and has consented', async () => {
            const org = await factory.create('organization', {
                createdAt: DateTime.fromISO(consentWhitelistCutoff).plus({ days: 1 }).toISO(),
                consent: { email: 'goodguy@whitehat.org', timestamp: Date.now() },
                terminalProviderOrder: [CARRIER_NAMES.uds]
            });
            const zipZone = await factory.create('udsZipZone');
            const zip = zipZone.zipcode;

            await factory.create('sequence', { name: 'OlxTracker' });

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

            const response = await request(global.server)
                .post('/service/v1/order')
                .auth(org.apiId, org.apiKey)
                .send(body);

            expect(response.status).to.eq(201);
        });
    });

    describe('GET /order/:id', () => {
        it('requires authentication', async () => {
            const response = await request(global.server)
                .get('/service/v1/order/1234');

            expect(response.status).to.eq(401);
            expect(response.body).excluding('request_id').to.eql(UnauthorizedError.toJSON());
        });

        it('returns a 400 if no shipment found', async () => {
            const org = await factory.create('organization');

            const response = await request(global.server)
                .get('/service/v1/order/1234')
                .auth(org.apiId, org.apiKey);

            expect(response.status).to.eq(404);
            expect(response.body).excluding('request_id').to.eql(NotFoundError.toJSON());
        });

        it('returns order if shipment is found', async () => {
            const org = await factory.create('organization');
            const shipment = await factory.create('shipment', { shipper: org.shipperSeqNum });

            const response = await request(global.server)
                .get(`/service/v1/order/${shipment._id.toString()}`)
                .auth(org.apiId, org.apiKey);

            expect(response.status).to.eq(200);
            expect(response.body).to.eql({
                tracking_number: shipment.tn,
                tracking_url: getTrackingUrl(shipment),
                shipper_name: shipment.shipper_name,
                shipper_phone: shipment.shipper_phone,
                reference_id: shipment.reference_id,
                reference_data: shipment.reference_data,
                to_address: shipment.to_address,
                from_address: shipment.from_address,
                parcel: {
                    carrier: shipment.docs[0].vendor,
                    tracking_num: shipment.docs[0].doc.trackingNumber,
                    ...shipment.parcel
                },
                rate: shipment.rate,
                label_format: shipment.label.type,
                label_base64: shipment.label.base64,
                create_time: shipment.created_date.toISOString(),
                cancelled_time: null
            });
        });

        it('fails if shipment does not belong to org', async () => {
            const org = await factory.create('organization');
            const shipment = await factory.create(
                'shipment',
                { shipper: org.shipperSeqNum + 1 }
            );

            const response = await request(global.server)
                .get(`/service/v1/order/${shipment._id.toString()}`)
                .auth(org.apiId, org.apiKey);

            expect(response.status).to.eq(404);
            expect(response.body).excluding('request_id').to.eql(NotFoundError.toJSON());
        });

        // TODO: we can add rate by onetime script for old shipments on DB in the future.
        it('returns rate with null if shipment\'s rate is undefined', async () => {
            const org = await factory.create('organization');
            const shipment = await factory.create('shipment', {
                shipper: org.shipperSeqNum,
                rate: undefined
            });

            const response = await request(global.server)
                .get(`/service/v1/order/${shipment._id.toString()}`)
                .auth(org.apiId, org.apiKey);

            expect(response.status).to.eq(200);
            expect(response.body).to.eql({
                tracking_number: shipment.tn,
                tracking_url: getTrackingUrl(shipment),
                shipper_name: shipment.shipper_name,
                shipper_phone: shipment.shipper_phone,
                reference_id: shipment.reference_id,
                reference_data: shipment.reference_data,
                to_address: shipment.to_address,
                from_address: shipment.from_address,
                parcel: {
                    carrier: shipment.docs[0].vendor,
                    tracking_num: shipment.docs[0].doc.trackingNumber,
                    ...shipment.parcel
                },
                rate: null,
                label_format: shipment.label.type,
                label_base64: shipment.label.base64,
                create_time: shipment.created_date.toISOString(),
                cancelled_time: null
            });
        });
    });

    describe('DELETE /order/:id', () => {
        it('requires authentication', async () => {
            const response = await request(global.server)
                .delete('/service/v1/order/1234');

            expect(response.status).to.eq(401);
            expect(response.body).excluding('request_id').to.eql(UnauthorizedError.toJSON());
        });

        it('returns a 404 if no shipment found', async () => {
            const org = await factory.create('organization');

            const response = await request(global.server)
                .delete('/service/v1/order/1234')
                .auth(org.apiId, org.apiKey);

            expect(response.status).to.eq(404);
            expect(response.body).excluding('request_id').to.eql(NotFoundError.toJSON());
        });

        it('returns success message if shipment status is not in `cancelled` or `delivered`', async () => {
            const org = await factory.create('organization');
            const shipment = await factory.create('shipment', { shipper: org.shipperSeqNum });

            const response = await request(global.server)
                .delete(`/service/v1/order/${shipment.tn}`)
                .auth(org.apiId, org.apiKey);

            expect(response.status).to.eq(200);
            expect(response.body.cancelled_time).not.to.eq(null);
        });

        it('returns 422 if the shipment is already cancelled', async () => {
            const org = await factory.create('organization');
            const shipment = await factory.create('shipment', {
                shipper: org.shipperSeqNum,
                status: ORDER_STATUS.cancelled
            });

            const response = await request(global.server)
                .delete(`/service/v1/order/${shipment.tn}`)
                .auth(org.apiId, org.apiKey);

            expect(response.status).to.eq(422);
            expect(response.body).excluding('request_id').to.eql(
                new UnprocessableEntityError({
                    errors: [{
                        name: 'order.status',
                        message: 'order already marked as cancelled'
                    }]
                }).toJSON()
            );
        });

        it('returns 422 if the shipment is already delivered', async () => {
            const org = await factory.create('organization');
            const shipment = await factory.create('shipment', {
                shipper: org.shipperSeqNum,
                status: ORDER_STATUS.delivered
            });

            const response = await request(global.server)
                .delete(`/service/v1/order/${shipment.tn}`)
                .auth(org.apiId, org.apiKey);

            expect(response.status).to.eq(422);
            expect(response.body).excluding('request_id').to.eql(
                new UnprocessableEntityError({
                    errors: [{
                        name: 'order.status',
                        message: 'order already delivered'
                    }]
                }).toJSON()
            );
        });
    });
});
