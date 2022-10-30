/* eslint-disable camelcase */
const chai = require('chai');
const Escher = require('escher-auth');
const express = require('express');
const uuid = require('uuid');
const { DateTime } = require('luxon');

const initShippoAuth = require('../../../../app/api/integrations/shippo/shippoAuth');
const Shipment = require('../../../../app/models/olxshipment');
const { ORDER_STATUS } = require('../../../../app/constants/carrierConstants');

const testCredential = 'TESTCRED';
const testScope = 'olx/shippo';
const testSecret = 'testSecret';
const testRequiredHeaders = ['content-type', 'host', 'x-shippo-date'];
const timestampFormat = "yyyyMMdd'T'HHmmss'Z'";

// @todo unskip carriers as time permits to set up new vcr cassettes
const tobaccoOrgOpts = { settings: { tobacco: true } };
const carriers = {
    capitalExpress: {
        skip: true,
        zipZoneMock: 'capitalExpressZipZone',
        orgOpts: tobaccoOrgOpts
    },
    'CL Logistics': {
        skip: true,
        zipZoneMock: 'cllogisticsZipZone',
        orgOpts: tobaccoOrgOpts
    },
    'Deliver-it': {
        skip: true,
        zipZoneMock: 'deliverItZipZone',
        orgOpts: tobaccoOrgOpts
    },
    // currently disabled do not unskip
    DHLeCommerce: {
        skip: true,
        zipZoneMock: 'dhlecommerceZipZone'
    },
    Hackbarth: {
        skip: true,
        zipZoneMock: 'hackbarthZipZone',
        orgOpts: tobaccoOrgOpts
    },
    JST: {
        skip: true,
        zipZoneMock: 'jstZipZone',
        orgOpts: tobaccoOrgOpts
    },
    LaserShip: {
        skip: true,
        zipZoneMock: 'lasershipZipZone'
    },
    LSO: {
        skip: true,
        zipZoneMock: 'lsoZipZone'
    },
    LSOTobacco: {
        skip: true,
        zipZoneMock: 'lsoZipZoneVape',
        orgOpts: tobaccoOrgOpts
    },
    Mercury: {
        skip: true,
        zipZoneMock: 'mercuryZipZone',
        orgOpts: tobaccoOrgOpts
    },
    MichaelsMessanger: {
        skip: true,
        zipZoneMock: 'michaelsMessengerZipZone',
        orgOpts: tobaccoOrgOpts
    },
    'Next Day Express': {
        skip: true,
        zipZoneMock: 'nextdayexpressZipZone',
        orgOpts: tobaccoOrgOpts
    },
    OnTrac: {
        skip: true,
        zipZoneMock: 'ontracZipZone'
    },
    ProMed: {
        skip: true,
        zipZoneMock: 'promedZipZone',
        orgOpts: tobaccoOrgOpts
    },
    QuickCourier: {
        skip: true,
        zipZoneMock: 'quickCourierZipZone',
        orgOpts: tobaccoOrgOpts
    },
    Sonic: {
        skip: true,
        zipZoneMock: 'sonicZipZone',
        orgOpts: tobaccoOrgOpts
    },
    UDS: {
        zipZoneMock: 'udsZipZone'
    },
    veterans: {
        skip: true,
        zipZoneMock: 'veteransZipZone',
        orgOpts: tobaccoOrgOpts
    }
};

const escherDefaults = {
    accessKeyId: testCredential,
    algoPrefix: 'SHIPPO',
    apiSecret: testSecret,
    vendorKey: 'SHIPPO',
    hashAlgo: 'SHA256',
    credentialScope: testScope,
    authHeaderName: 'Authorization',
    dateHeaderName: 'X-Shippo-Date',
    clockSkew: 300
};

const eventGenerator = {
    noEvents: () => [],
    noLane: async ({ provider, trackingNumber }) => {
        const { plusOne } = await chai.factory.create('expectedDeliveryDates');
        const opts = {
            provider,
            timestamp: plusOne,
            trackingNumber
        };
        return Promise.all([chai.factory.create('event', opts)]);
    },
    withLane: async ({ provider, trackingNumber: parcelTrackingNumber }) => {
        const freightTrackingNumber = uuid.v4();
        const { plusOne } = await chai.factory.create('expectedDeliveryDates');

        const freightOpts = { trackingNumber: freightTrackingNumber };

        const freightSegment = await chai.factory.create('liveSegment', freightOpts);
        freightOpts.liveSegmentId = freightSegment._id;
        freightOpts.timestamp = plusOne;

        const parcelOpts = {
            lane: [freightSegment._id],
            provider,
            terminal: true,
            trackingNumber: parcelTrackingNumber
        };

        const parcelSegment = await chai.factory.create('liveSegment', parcelOpts);
        parcelOpts.liveSegmentId = parcelSegment._id;
        parcelOpts.timestamp = plusOne;
        delete parcelOpts.lane;
        delete parcelOpts.terminal;

        return Promise.all([
            chai.factory.create('event', freightOpts),
            chai.factory.create('event', parcelOpts)
        ]);
    }
};

const createFullZoneMatrix = async () => {
    const matrix = new Array(999).fill('1*');
    return chai.factory.create('zoneMatrixFull', { matrix });
};

const createOrganization = async (opts) => chai.factory.create('organization', opts);

const createRateCards = async (org = {}) => {
    let { shipperSeqNum } = org;
    if (!shipperSeqNum) {
        shipperSeqNum = (await createOrganization()).shipperSeqNum;
    }
    await createFullZoneMatrix();
    await chai.factory.create('rateCards', { shipperId: shipperSeqNum, zone: 1, weight: 16, cost: 5.00 });
};

const createShipment = async (opts = {}) => {
    const {
        createLane = false,
        cancelled = false,
        delivered = false,
        noEvents = false,
        orgOpts = {},
        provider = 'DHLeCommerce',
        shipmentOpts = {}
    } = opts;

    // create dates
    const { today } = await chai.factory.create('expectedDeliveryDates');

    // create org
    const org = await createOrganization(orgOpts);
    const { shipperSeqNum } = org;

    await createRateCards();

    // create shipment
    const trackingNumber = uuid.v4();
    const shipOpts = {
        shipper: shipperSeqNum,
        docs: [{
            vendor: provider,
            doc: { trackingNumber }
        }],
        created_date: new Date(today),
        ...shipmentOpts
    };

    if (delivered === true) {
        shipOpts.status = ORDER_STATUS.delivered;
    } else if (cancelled === true) {
        shipOpts.status = ORDER_STATUS.cancelled;
    }

    const shipment = await chai.factory.create('shipment', shipOpts);

    // create tracking events
    const mode = (noEvents)
        ? 'noEvents'
        : (createLane) ? 'withLane' : 'noLane';
    const events = await eventGenerator[mode]({ provider, trackingNumber });

    return {
        events,
        org,
        shipment
    };
};

const createZipZone = async (carrier) => chai.factory.create(carriers[carrier].zipZoneMock);

/**
 * This expects resuts options object as used
 * @param req
 * @param opts
 * @returns {*}
 */
const decorateAuthorizationHeader = (req, body, opts = {}) => {
    const {
        credential = escherDefaults.accessKeyId,
        scope = escherDefaults.credentialScope,
        secret = escherDefaults.apiSecret,
        requiredHeaders = testRequiredHeaders
    } = opts;

    const escher = new Escher({
        ...escherDefaults,
        accessKeyId: credential,
        apiSecret: secret,
        credentialScope: scope,
        requiredHeaders
    });

    // Escher expects headers to be in "entries" format - [ [ key, value ], [ key, value ] ]
    // but we want to both accept and return a map of header entries

    // put everything into object format for header merging
    let headers = (Array.isArray(req.headers)) ? Object.fromEntries(req.headers) : req.headers;

    headers = {
        ...getDefaultHeaders(),
        ...headers
    };

    // convert to array for signing
    req.headers = Object.entries(headers);

    escher.signRequest(req, body, requiredHeaders);

    // convert back to object
    req.headers = Object.fromEntries(req.headers);
    return req;
};

const getAuthorizationParts = async (opts = {}) => {
    const { orgOpts } = opts;
    const org = await chai.factory.create('organization', orgOpts);
    const { apiId, apiKey } = org;
    return {
        accountToken: apiKey,
        account_id: apiId,
        body: { account: { account_id: apiId } },
        headers: { AccountToken: apiKey },
        org
    };
};

const getDefaultHeaders = () => ({
    Host: getHost(),
    'Content-Type': 'application/json',
    'X-Shippo-Date': DateTime.now().toFormat(timestampFormat)
});

const getFns = (opts = {}) => {
    const {
        credential = testCredential,
        requireAccountToken = true,
        requiredHeaders = testRequiredHeaders,
        scope = testScope,
        secret = testSecret
    } = opts;

    return initShippoAuth({
        credential,
        requireAccountToken,
        requiredHeaders,
        scope,
        secret
    });
};

const getHost = () => global?.server.address()?.address;

const getPort = () => global?.server.address()?.port;

const getMockRequest = (opts = {}) => {
    const defaults = {
        addAuthHeader: true,
        credential: escherDefaults.accessKeyId,
        scope: escherDefaults.credentialScope,
        secret: escherDefaults.apiSecret,
        requiredHeaders: testRequiredHeaders,
        host: getHost(),
        port: getPort(),
        method: 'POST',
        protocol: 'https',
        path: '/test/path',
        headers: getDefaultHeaders(),
        body: toBuffer({ foo: 'bar' })
    };

    const headers = {
        ...defaults.headers,
        ...opts.headers
    };

    const _opts = {
        ...defaults,
        ...opts,
        headers
    };

    if (!Buffer.isBuffer(_opts.body)) {
        _opts.body = toBuffer(_opts.body);
    }

    const {
        addAuthHeader,
        scope,
        credential,
        secret,
        requiredHeaders,
        host,
        port,
        method,
        path,
        body
    } = _opts;

    const req = {
        host,
        port,
        method,
        url: path,
        headers
    };

    if (addAuthHeader) {
        const signingOpts = {
            credential,
            scope,
            secret,
            requiredHeaders
        };

        decorateAuthorizationHeader(req, body, signingOpts);
    }

    // masquerade this is express request object
    req.body = body;
    // cast header names to lowercase
    req.headers = Object.fromEntries(
        Object.entries(req.headers).map(([key, value]) => [key.toLowerCase(), value])
    );

    Object.setPrototypeOf(req, express.request);
    return req;
};

const sendAuthorizedChaiRequest = async (opts) => {
    const {
        host = getHost(),
        method = 'post',
        path,
        port = getPort(),
        headers = {},
        body
    } = opts;

    // we need to set up mock req object to use with decorateAuthorizationHeader
    let req = {
        host,
        port,
        method: method.toUpperCase(),
        url: path,
        headers
    };

    const bodyStr = (typeof body !== 'string') ? JSON.stringify(body) : body;

    req = decorateAuthorizationHeader(req, bodyStr);

    let out = chai.request(global.server)[method.toLowerCase()](path);

    // set headers
    Object.entries(req.headers).forEach(([key, value]) => {
        out = out.set(key, value);
    });

    // send request and return promise
    return out.send(body);
};

let sendRateId = true;
const testLabelRequest = async (opts = {}) => {
    const { carrier, mochaThis, path } = opts;

    const { skip, orgOpts } = carriers[carrier];

    if (skip) {
        return mochaThis.skip();
    }

    // create org and get auth info
    const { account_id, accountToken, org } = await getAuthorizationParts({ orgOpts });

    // create zipZone and rate cards
    const zipZone = await createZipZone(carrier);
    await chai.factory.create('sequence', { name: 'OlxTracker' });
    await createRateCards(org);

    // alternate between sending rate_id or not
    // right now this should result in same instalabel behavior
    sendRateId = !sendRateId;

    const service = 'Expedited';
    const shipment_id = 'cf6fea899f1848b494d9568e8266e076';
    const labelBase64 = 'XlhBXlBXODAwXkxIMCwwXkZPMCw0MF5BUU4sMTFeRkRGcm9tOiBeRlNeRk82MCw0MF5BUU4sMTFeRkRPTkUgTElWRV5GU15GTzYwLDcwXkFRTiwxMV5GRDExMTEgUmlkZ2UgQXZlIF5GU15GTzYwLDEwMF5BUU4sMTFeRkRMb21iYXJkLCBJTCAgNjAxNDheRlNeRk8wLDEzMF5HQjgwMCwxLDReRlNeRk8wLDE4MF5BUk4sMTFeRkRUbzogXkZTXkZPODAsMTgwXkFSTiwxMV5GREpBTUlMQSBTTUFMTF5GU15GTzgwLDIzMF5BUk4sMTFeRkRBdHRuOiBTSElQUEVSIE5BTUVeRlNeRk84MCwyODBeQVJOLDExXkZEMTc0IFJJVkVSREFMRSBBVkUgRl5GU15GTzgwLDMzMF5BUk4sMTFeRkRCUk9PS0xZTiwgSUwgIDYxMDQzXkZTXkZPMCw0MTBeR0I4MDAsMSw0XkZTXkZPMTAsNDYwXkFRTiwxOF5GRERhdGU6IDIwMjEtMDQtMjJeRlNeRk8yMjAsNDYwXkFRTiwxOF5GRERlbGl2ZXJ5IEJ5OiAxNzowMDowMF5GU15GTzY1MCw0NjBeQVFOLDE4XkZEUGtnOiAxIG9mIDFeRlNeRk8xMCw0OTBeQVFOLDE4XkZEVURTOiAyOTM2Nzc5OSAtIDYyNDU3Mzk1XkZTXkZPMTAsNTIwXkFRTiwxOF5GQjc1MCw2LDAsTCw2MF5GREluc3RyOl5GU15GTzEwMCw1MjBeQVJOLDE4XkZCNjAwLDEsMCxDLDBeRkRQUlUgMjcgLSBCUk9PS0xZTiAtIDYxMDQzXkZTXkZPMTQ0LDU2MF5CWTNeQkMsMTAwLE5eRkRVRFMyOTM2Nzc5OTFeRlNeRk8xMDAsNjcwXkFSTiwxOF5GQjYwMCwxLDAsQywwXkZEVURTMjkzNjc3OTkxXkZTXlha';

    const body = {
        account: {
            account_id
        },
        shipment: {
            shipment_id,
            shipment_date: '2018-07-27T20:04:35.831Z',
            sender_address: {
                city: 'Santa Fe Springs',
                country: 'US',
                email: 'email@email.com',
                name: 'Andrew Tribone',
                phone: '1-800-866-0286',
                state: 'CA',
                street1: '12588 Florence Ave.',
                street2: null,
                zip: '90670'
            },
            recipient_address: {
                city: 'Brooklyn',
                country: 'US',
                email: 'jamila@jamila.com',
                name: 'Jamila Small',
                phone: '3476918291',
                state: 'NY',
                street1: '174 Riverdale Ave',
                street2: 'F',
                zip: zipZone.zipcode
            },
            delivery_instructions: 'Our buzzer is behind the cactus',
            parcels: [
                {
                    items: [
                        {
                            description: 'Hippo shirt',
                            origin_country: 'US',
                            sku_code: 'ASJ123H',
                            hs_code: '1234AA',
                            unit_weight: {
                                value: '1',
                                unit: 'lb'
                            },
                            unit_value: {
                                amount: '10.45',
                                currency: 'USD'
                            },
                            quantity: 1
                        }
                    ],
                    dimensions: {
                        height: '2',
                        length: '16',
                        unit: 'in',
                        width: '12'
                    },
                    weight: {
                        unit: 'lb',
                        value: '0.3'
                    }
                }
            ],
            is_signature_required: false
        },
        image_format: 'ZPLII',
        rate_id: (sendRateId) ? '5e40ead7cffe4cc1ad45108696162e42' : null,
        service
    };

    const response = await sendAuthorizedChaiRequest({
        path,
        body,
        headers: { AccountToken: accountToken }
    });

    const expectedResponse = {
        account_id,
        shipment_id,
        service,
        amount: '500.00',
        currency: 'USD',
        eta_date: '',
        image: {
            format: 'ZPLII',
            content: labelBase64
        },
        messages: []
    };

    // test API response
    chai.expect(response.status).to.eq(201);
    chai.expect(response.body).to.deep.include(expectedResponse);
    /* eslint-disable no-unused-expressions */
    chai.expect(response.body.label_id).to.not.be.empty;
    chai.expect(response.body.rate_id).to.not.be.empty;
    chai.expect(response.body.tracking_number).to.not.be.empty;
    /* eslint-enable no-unused-expressions */

    // check gateway (DB) storage
    const shipment = await Shipment.dbget();
    chai.expect(shipment.reference_id).to.eq(shipment_id);
    chai.expect(shipment.reference_data).to.eq(shipment_id);
    chai.expect(shipment.label.type).to.eq('Z4x6');
};

const testRateRequest = async (opts = {}) => {
    const { path, orgOpts = {} } = opts;

    // create org and get auth info
    const { account_id, accountToken, org } = await getAuthorizationParts({ orgOpts });
    await createRateCards(org);

    // alternate between sending rate_id or not
    // right now this should result in same instalabel behavior
    sendRateId = !sendRateId;

    const service = 'Expedited';
    const shipment_id = 'cf6fea899f1848b494d9568e8266e076';

    const body = {
        account: {
            account_id
        },
        shipment: {
            shipment_id,
            shipment_date: '2018-07-27T20:04:35.831Z',
            sender_address: {
                city: 'Santa Fe Springs',
                country: 'US',
                email: 'email@email.com',
                name: 'Andrew Tribone',
                phone: '1-800-866-0286',
                state: 'CA',
                street1: '12588 Florence Ave.',
                street2: null,
                zip: '90670'
            },
            recipient_address: {
                city: 'Brooklyn',
                country: 'US',
                email: 'jamila@jamila.com',
                name: 'Jamila Small',
                phone: '3476918291',
                state: 'NY',
                street1: '174 Riverdale Ave',
                street2: 'F',
                zip: '00110'
            },
            delivery_instructions: 'Our buzzer is behind the cactus',
            parcels: [
                {
                    items: [
                        {
                            description: 'Hippo shirt',
                            origin_country: 'US',
                            sku_code: 'ASJ123H',
                            hs_code: '1234AA',
                            unit_weight: {
                                value: '1',
                                unit: 'lb'
                            },
                            unit_value: {
                                amount: '10.45',
                                currency: 'USD'
                            },
                            quantity: 1
                        }
                    ],
                    dimensions: {
                        height: '2',
                        length: '16',
                        unit: 'in',
                        width: '12'
                    },
                    weight: {
                        unit: 'lb',
                        value: '0.3'
                    }
                }
            ],
            is_signature_required: false
        },
        service
    };

    const response = await sendAuthorizedChaiRequest({
        path,
        body,
        headers: { AccountToken: accountToken }
    });

    const expectedResponse = {
        account_id,
        shipment_id
        // rates: [<expectedRate>],
        // messages: []
    };

    const expectedRate = {
        amount: '500.00',
        currency: 'USD',
        eta_date: '',
        // rate_id
        service
    };

    // test API response
    chai.expect(response.status).to.eq(201);
    chai.expect(response.body).to.include(expectedResponse);
    /* eslint-disable-next-line no-unused-expressions */
    chai.expect(response.body.messages).to.be.an('array').that.is.empty;

    const rate = response.body.rates[0];
    chai.expect(rate).to.include(expectedRate);
    /* eslint-disable-next-line no-unused-expressions */
    chai.expect(rate.rate_id).to.not.be.empty;
};

const toBuffer = (data) => Buffer.from(JSON.stringify(data), 'utf8');

module.exports = {
    carriers,
    createShipment,
    getAuthorizationParts,
    getFns,
    getMockRequest,
    sendAuthorizedChaiRequest,
    testCredential,
    testLabelRequest,
    testRateRequest,
    timestampFormat,
    toBuffer
};
