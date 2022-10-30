const chai = require('chai');
const jwt = require('jsonwebtoken');
const uuid = require('uuid');
const { DateTime } = require('luxon-business-days');

const gconfig = require('../../app/config');
const Identities = require('../../app/models/identities');
const LSSortCenters = require('../../app/models/lsSortCenters');
const mongo = require('../../app/helpers/mongo');
const organizations = require('../../app/repositories/organizations');
const Provider = require('../../app/repositories/provider');
const rateCards = require('../../app/models/rateCards');
const Roles = require('../../app/models/roles');
const Sequence = require('../../app/models/sequence');
const Services = require('../../app/models/services');
const ServiceStatus = require('../../app/models/serviceStatus');
const Shipment = require('../../app/models/olxshipment');
const TrackingNumber = require('../../app/models/olxtracker');
const transport = require('../../app/repositories/transport');
const users = require('../../app/repositories/users');
const zipcodes = require('../../app/models/zipcodes');
const ZipZone = require('../../app/models/zipZones');
const zoneMatrix = require('../../app/models/zoneMatrix');
const { CARRIER_NAMES } = require('../../app/constants/carrierConstants');
const { createWebhook } = require('../../app/repositories/webhooks');

const create = (type, args) => chai.factory.create(type, args);
const define = (type, fn) => chai.factory.define(type, fn);
const defineFromMap = (obj) => Object.entries(obj).forEach(([type, fn]) => define(type, fn));

// misc.

define('sequence', async (args = {}) => {
    if (!args.name) throw new Error('sequence name is required');

    const existing = await Sequence.dbget({ _id: args.name });

    if (existing) {
        return existing;
    }

    const id = await Sequence.newseq({
        start: 0,
        end: 9999,
        ...args
    });
    return Sequence.dbget({ _id: id });
});

define('service', async (args = {}) => {
    return Services.dbset({ name: 'test', ...args });
});

define('serviceStatus', async (args = {}) => {
    const serviceId = args.serviceId || await create('service').then((data) => data._id);
    const now = new Date();

    return ServiceStatus.dbset({
        created_at: now,
        updated_at: now,
        updateCnt: 1,
        status: {
            bytesTx: 1,
            bytesRx: 2,
            responseMs: 3
        },
        ...args,
        serviceId
    });
});

// org, users, roles

define('organization', async (args = {}) => {
    await create('sequence', {
        name: 'Shippers',
        start: args.shipperSeqNum || 0
    });
    const { id, ...rest } = await organizations.createOrganization({
        name: 'merchantName',
        type: 'Shipper',
        description: 'test',
        address: 'test',
        city: 'test',
        contactName: 'test',
        contactPhone: 'test',
        contactEmail: 'test@xdelivery.ai',
        updatedAt: new Date(),
        settings: {},
        consent: {
            email: 'bossman@megacorp.edu',
            timestamp: new Date()
        },
        createdAt: '2020-01-01 00:00:00.731Z',
        terminalProviderOrder: [CARRIER_NAMES.uds, CARRIER_NAMES.laserShip, CARRIER_NAMES.parcelPrep],
        ...args
    });

    return { _id: id, ...rest };
});

define('role', async (args = {}) => {
    const id = await Roles.dbset({
        name: uuid.v4(),
        authLevel: 1,
        description: 'System User',
        ...args
    });
    return Roles.dbget({ _id: id });
});

define('user', async (args = {}) => {
    const role = await create('role');
    const org = await create('organization');
    const { id, ...rest } = await users.createUser({
        firstname: 'Test',
        lastname: 'User',
        password: 'password',
        email: 'test@xdelivery.ai',
        roleId: role._id,
        organizationId: org._id,
        ...args
    });

    return { _id: id, ...rest };
});

define('admin', async (args = {}) => {
    const role = await create('role', {
        name: 'Admin',
        authLevel: 2,
        description: 'System Administrator'
    });
    const org = await create('organization');
    const { id, ...rest } = await users.createUser({
        firstname: 'Test',
        lastname: 'Admin',
        password: 'password',
        email: 'testAdmin@xdelivery.ai',
        roleId: role._id,
        organizationId: org._id,
        ...args
    });

    return { _id: id, ...rest };
});

// sort centers

define('lsSortCenter', async (args = {}) => {
    return LSSortCenters.dbset({
        CustomerBranch: 'ONELIVNP',
        PickupType: 'None',
        ServiceCode: 'RD',
        Origin: {
            LocationType: 'Business',
            Contact: 'Warehouse Manager',
            Organization: 'OneLive',
            Address: '7000 BURLESON RD',
            Address2: 'STE A - 100',
            PostalCode: '78744-3214',
            City: 'AUSTIN',
            State: 'TX',
            Country: 'US',
            Phone: '',
            PhoneExtension: '',
            Email: '',
            Instruction: '',
            Note: '',
            UTCExpectedReadyForPickupBy: '',
            UTCExpectedDeparture: '',
            CustomerRoute: '',
            CustomerSequence: ''
        },
        Injection: {
            LocationType: 'Business',
            Contact: 'Warehouse Manager',
            Organization: 'LaserShip',
            Address: '2270 US HIGHWAY 130',
            Address2: '',
            PostalCode: '08810-1411',
            City: 'DAYTON',
            State: 'NJ',
            Country: 'US',
            Phone: '',
            PhoneExtension: '',
            Email: '',
            Instruction: '',
            Note: '',
            UTCExpectedInjection: ''
        },
        Return: {
            LocationType: 'Business',
            Contact: 'Returns Dept.',
            Organization: 'OneLive',
            Address: '7000 BURLESON RD',
            Address2: 'STE A - 100',
            PostalCode: '78744-3214',
            City: 'AUSTIN',
            State: 'TX',
            Country: 'US',
            Phone: '(512) 371-6924',
            PhoneExtension: '',
            Email: '',
            Instruction: '',
            Note: ''
        },
        ...args
    });
});

// zip zones

defineFromMap({
    zipZone: async (args = {}) => {
        return ZipZone.dbset({
            zipcode: '75243',
            carrier: 'testCarrier',
            service: 'testCarrierService',
            max_weight: 2400,
            shipper_id: null,
            options: {
                accountNumber: '123',
                pickupAddress: {
                    address1: '1234 Some Street',
                    city: 'Dallas',
                    state: 'TX',
                    zip: '75243'
                }
            },
            ...args
        });
    },
    axlehireZipZone: async (args = {}) => {
        return ZipZone.dbset({
            zipcode: '75243',
            carrier: 'Axlehire',
            shipper_id: null,
            max_weight: 160,
            options: {
                pickupAddress: {
                    address1: '1234 Some Street',
                    city: 'Dallas',
                    state: 'TX',
                    zip: '75243'
                }
            },
            ...args
        });
    },
    capitalExpressZipZone: async (args = {}) => {
        return create('conciseZipZone', {
            carrier: 'CAPE',
            sortcode: 'CE-DSM',
            zipcode: '50601',
            tobacco: true,
            options: {
                accountNumber: '8059',
                pickupAddress: {
                    address1: '1400 SE Gateway Drive #105',
                    city: 'Grimes',
                    state: 'IA',
                    zip: '50111'
                }
            },
            ...args
        });
    },
    cllogisticsZipZone: async (args = {}) => {
        return create('conciseZipZone', {
            carrier: 'CSL',
            sortcode: 'CS-001',
            zipcode: '53005',
            tobacco: true,
            options: {
                accountNumber: '3652a',
                pickupAddress: {
                    address1: '11001 W. MITCHELL ST.',
                    city: 'MILWUAKEE',
                    state: 'WI',
                    zip: '53214'
                }
            },
            ...args
        });
    },
    conciseZipZone: async (args = {}) => {
        return ZipZone.dbset({
            max_weight: 160,
            service: 'ST',
            zipcode: '32095',
            shipper_id: null,
            ...args
        });
    },
    deliverItZipZone: async (args = {}) => {
        return create('conciseZipZone', {
            carrier: 'DI',
            sortcode: 'DI-SFS',
            zipcode: '91767',
            tobacco: true,
            options: {
                accountNumber: '103591',
                pickupAddress: {
                    address1: '1170 E Holt Bl',
                    city: 'Ontario',
                    state: 'CA',
                    zip: '91767'
                }
            },
            ...args
        });
    },
    dhlecommerceZipZone: async (args = {}) => {
        return ZipZone.dbset({
            zipcode: '01001',
            carrier: 'DHLeCommerce',
            service: 'GND',
            max_weight: 1120,
            shipper_id: null,
            options: { pickupNumber: '5351358', distributionCenter: 'USRDU1' },
            ...args
        });
    },
    dispatchScienceZipZone: async (args = {}) => {
        return ZipZone.dbset({
            zipcode: '5128',
            service: 'REG',
            tobacco: true,
            credentials: true,
            max_weight: 500,
            options: {
                sortcode: 'DFW',
                sortcode2: 'LAX',
                vehicle: 'CAR',
                parcelType: 'SmallBox',
                pickupTimezone: 'America/Chicago',
                pickupAddress: {
                    address1: '410 Baylor',
                    address2: '',
                    city: 'Austin',
                    state: 'TX',
                    zip: '78703'
                }
            },
            ...args

        });
    },
    expeditedDeliveryZipZone: async (args = {}) => {
        return create('dispatchScienceZipZone', {
            carrier: CARRIER_NAMES.expeditedDelivery,
            service: 'VAPE',
            zipcode: '20009',
            options: {
                sortcode: 'EXP-01',
                vehicle: 'CAR',
                parcelType: 'VAPE',
                pickupTimezone: 'America/Chicago',
                pickupAddress: {
                    address1: '1530 CATON CENTER DRIVE - SUITE D',
                    address2: '',
                    city: 'HALETHORPE',
                    state: 'MD',
                    zip: '21227'
                }
            },
            ...args
        });
    },
    hackbarthZipZone: async (args = {}) => {
        return create('conciseZipZone', {
            tobacco: true,
            sortcode: 'HB-ATL',
            carrier: 'HKB',
            zipcode: '30083',
            options: {
                accountNumber: '4096',
                pickupAddress: {
                    address1: '1380 Beverage Dr STE A',
                    city: 'Stone Mountain',
                    state: 'GA',
                    zip: '30083'
                }
            },
            ...args
        });
    },
    jetZipZone: async (args = {}) => {
        return create('conciseZipZone', {
            carrier: 'JTL',
            sortcode: '',
            zipcode: '07001',
            tobacco: true,
            max_weight: 160,
            options: {
                accountNumber: '347',
                pickupAddress: {
                    address1: '',
                    city: '',
                    state: '',
                    zip: ''
                }
            },
            ...args
        });
    },
    jstZipZone: async (args = {}) => {
        return create('conciseZipZone', {
            carrier: 'JST',
            sortcode: 'JST-01',
            zipcode: '03301',
            tobacco: true,
            options: {
                accountNumber: '152',
                pickupAddress: {
                    address1: '1376 West Central Street',
                    city: 'Fanklin',
                    state: 'MA',
                    zip: '2038'
                }
            },
            ...args
        });
    },
    lasershipZipZone: async (args = {}) => {
        await create('lsSortCenter');

        const document = {
            zipcode: '01105',
            carrier: CARRIER_NAMES.laserShip,
            max_weight: 2400, // TODO - not sure what this value should be
            options: {
                customerBranch: 'ONELIVNP',
                das: 'DAS',
                bestZone: 'SBSC',
                bestTNT: 'SBSC'
            },
            ...args
        };

        return {
            _id: await ZipZone.dbset(document),
            ...document
        };
    },
    lsoZipZone: async (args = {}) => {
        return ZipZone.dbset({
            zipcode: '70601',
            carrier: 'LSO',
            service: 'GroundBasic',
            max_weight: 1120,
            shipper_id: null,
            options: {
                accountNumber: '201116'
            },
            ...args
        });
    },
    lsoZipZoneVape: async (args = {}) => {
        return create('lsoZipZone', {
            zipcode: '75002',
            sortcode: '4 - LSO',
            tobacco: true,
            options: {
                accountNumber: '203438',
                injection: {
                    address1: '506 Sandau Rd',
                    city: 'San Antonio',
                    state: 'TX',
                    zip: '78216'
                }
            },
            ...args
        });
    },
    mercuryZipZone: async (args = {}) => {
        return create('conciseZipZone', {
            carrier: 'MERC',
            sortcode: 'Merc-01',
            zipcode: '43002',
            tobacco: true,
            options: {
                accountNumber: '376',
                pickupAddress: {
                    address1: '3472 Stop 8 rd.',
                    city: 'Dayton',
                    state: 'OH',
                    zip: '45414'
                }
            },
            ...args
        });
    },
    michaelsMessengerZipZone: async (args = {}) => {
        return create('conciseZipZone', {
            carrier: 'MMES',
            sortcode: 'MMS-01',
            zipcode: '83642',
            tobacco: true,
            options: {
                accountNumber: 'OLIVE',
                pickupAddress: {
                    address1: '1834 Airport way',
                    city: 'BOISE',
                    state: 'ID',
                    zip: '83705'
                }
            },
            ...args
        });
    },
    nextdayexpressZipZone: async (args = {}) => {
        return create('conciseZipZone', {
            carrier: 'NXDY',
            sortcode: 'NDE-001',
            zipcode: '97003',
            tobacco: true,
            options: {
                accountNumber: '1041',
                pickupAddress: {
                    address1: '3340 NW YEON AVENUE SUITE 17',
                    city: 'PORTLAND',
                    state: 'OR',
                    zip: '97210'
                }
            },
            ...args
        });
    },
    ontracZipZone: async (args = {}) => {
        return ZipZone.dbset({
            zipcode: '99215',
            sortcode: null,
            carrier: 'OnTrac',
            service: 'C',
            max_weight: 2400,
            shipper_id: null,
            options: {
                injectionName: 'SLC'
            },
            ...args
        });
    },
    parcelprepZipZone: async (args = {}) => {
        return ZipZone.dbset({
            zipcode: '75243',
            carrier: 'ParcelPrep',
            service: 'PRIORITY_MAIL',
            max_weight: 1600,
            shipper_id: null,
            options: { consolidationFacility: 'XAMERICANFORKUT' },
            ...args
        });
    },
    pillowZipZone: async (args = {}) => {
        return create('dispatchScienceZipZone', {
            carrier: CARRIER_NAMES.pillowLogistics,
            service: 'VAPE',
            zipcode: '46268',
            options: {
                sortcode: 'PIL-01',
                vehicle: 'CAR',
                parcelType: 'VAPE',
                pickupTimezone: 'America/Chicago',
                pickupAddress: {
                    address1: '5128 W. 79th St.',
                    address2: '',
                    city: 'Indianapolis',
                    state: 'IN',
                    zip: '46268'
                }
            },
            ...args
        });
    },
    promedZipZone: async (args = {}) => {
        return create('conciseZipZone', {
            carrier: 'PRMD',
            sortcode: 'PM-ROK',
            zipcode: '49610',
            tobacco: true,
            options: {
                accountNumber: '948',
                pickupAddress: {
                    address1: '1316 N EDISON',
                    city: 'ROYAL OAK',
                    state: 'MI',
                    zip: '48067'
                }
            },
            ...args
        });
    },
    quickCourierZipZone: async (args = {}) => {
        return create('conciseZipZone', {
            carrier: 'QUICK',
            sortcode: 'QK-PBG',
            zipcode: '15001',
            tobacco: true,
            options: {
                accountNumber: '2336',
                pickupAddress: {
                    address1: '505 PARKWAY VIEW DR',
                    city: 'PITTSBURGH',
                    state: 'PA',
                    zip: '15205'
                }
            },
            ...args
        });
    },
    sonicZipZone: async (args = {}) => {
        return create('conciseZipZone', {
            sortcode: 'SC-ORL',
            carrier: 'SONIC',
            zipcode: '32095',
            tobacco: true,
            options: {
                accountNumber: '3935',
                pickupAddress: {
                    address1: '2125 VISCOUNT ROW',
                    city: 'ORLANDO',
                    state: 'FL',
                    zip: '32809'
                }
            },
            ...args
        });
    },
    udsZipZone: async (args = {}) => {
        return ZipZone.dbset({
            zipcode: '61043',
            carrier: CARRIER_NAMES.uds,
            max_weight: 2400, // TODO - not sure what this value should be
            options: {
                name: 'Lombard',
                zone: 6,
                tnt: 1
            },
            ...args
        });
    },
    veteransZipZone: async (args = {}) => {
        return create('conciseZipZone', {
            carrier: 'VET',
            sortcode: 'VET-01',
            zipcode: '60000',
            tobacco: true,
            options: {
                accountNumber: '103677',
                pickupAddress: {
                    address1: '5999 Butterfield Road',
                    city: 'Hillside',
                    state: 'IL',
                    zip: '60162'
                }
            },
            ...args
        });
    },
    zipExpressZipZone: async (args = {}) => {
        return create('conciseZipZone', {
            carrier: 'ZIP',
            sortcode: 'ZIP-LOU',
            zipcode: '42066',
            tobacco: true,
            max_weight: 160,
            options: {
                accountNumber: '15002',
                pickupAddress: {
                    address1: '4617 Allmond Ave.',
                    city: 'Louisville',
                    state: 'KY',
                    zip: '40209'
                }
            },
            ...args
        });
    },
    statZipZone: async (args = {}) => {
        return create('conciseZipZone', {
            carrier: 'STAT',
            sortcode: 'STAT-ATL',
            zipcode: '30102',
            tobacco: true,
            options: {
                accountNumber: '909',
                pickupAddress: {
                    address1: '1756 Wilwat Dr. NW',
                    city: 'Norcross',
                    state: 'GA',
                    zip: '30093'
                }
            },
            ...args
        });
    }
});

// orders

defineFromMap({
    orderRequest: async (args = {}) => {
        const {
            to_address: toAddress = {},
            from_address: fromAddress = {},
            parcel = {}, ...rest
        } = args;

        return {
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
                zip: '11211',
                country: 'US',
                phone: '347-691-8291',
                ...toAddress
            },
            from_address: {
                name: 'Andrew Tribone',
                address1: '12588 Florence Ave.',
                address2: '',
                city: 'Santa Fe Springs',
                state: 'CA',
                zip: '90670',
                country: 'US',
                phone: '1-800-866-0286',
                ...fromAddress
            },
            parcel: {
                description: 'Clothing and Accessories',
                length: '16',
                width: '12',
                height: '2',
                weight: '0.3',
                value: '19.99',
                reference: '00008872784502755082',
                attributes: {},
                ...parcel
            },
            label_format: 'Z4x6',
            ...rest
        };
    },
    conciseRequest: async (args = {}) => {
        const {
            to_address: toAddress = {}
        } = args;

        delete args.to_address;

        const opts = {
            to_address: {
                zip: '90210',
                ...toAddress
            },
            label_format: 'P4x6',
            ...args
        };

        return create('orderRequest', opts);
    }
});

define('rateCards', async (args = {}) => {
    const document = {
        shipperId: 1,
        expiresAt: new Date('2050-01-01'),
        effectiveAt: new Date('2000-01-01'),
        weight: 16,
        zone: 1,
        cost: 5.50,
        ...args
    };
    return {
        _id: await rateCards.dbset(document),
        ...document
    };
});

define('zoneMatrix', async (args = {}) => {
    const DEFAULT_MATRIX = ['0', '1*', '2', '3', '4', '51', '6a', '7e', '8'];
    const document = {
        prefix: '001',
        matrix: DEFAULT_MATRIX,
        ...args
    };
    return {
        _id: await zoneMatrix.dbset(document),
        ...document
    };
});

define('zoneMatrixFull', async (args = {}) => {
    const promises = Array(999).fill('').map((_, i) => {
        const prefix = (i++).toString().padStart(3, '0');
        return create('zoneMatrix', {
            ...args,
            prefix
        });
    });

    return Promise.all(promises);
});

// shipments

define('shipment', async (args = {}) => {
    await create('sequence', { name: 'OlxTracker' });
    const trackingNumber = await new TrackingNumber({ shipper: 1, lane: 0 });

    let org;
    if (!args.shipper) {
        org = await create('organization');
    }

    return Shipment.dbset({
        tn: trackingNumber.toString(),
        shipper: org ? org.shipperSeqNum : args.shipper,
        status: '--',
        docs: [{
            vendor: 'vendor',
            doc: { trackingNumber: uuid.v4(), Label: 'XlhBXkZEWF5GU15YWg==' }
        }],
        tracking: [{ foo: 'bar' }, { spam: 'ham' }],
        shipper_name: 'OneLiveX',
        shipper_phone: '800-866-0286',
        reference_id: '62457395',
        reference_data: '62457395',
        trackingStatus: '--',
        to_address: {
            name: 'Jamila Small',
            address1: '174 Riverdale Ave',
            address2: 'F',
            city: 'Brooklyn',
            state: 'NY',
            zip: '00010',
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
            reference: '00008872784502755082'
        },
        rate: {
            cost: '5.00',
            dollar_cost: '$5.00',
            billable_weight: 3,
            zone: 1,
            use_dim_weight: true
        },
        organization: { settings: {} },
        label: { type: 'Z4x6', base64: 'Zm9vYmFy' },
        created_date: new Date(),
        ...args
    });
});

define('event', async (args = {}) => {
    return transport.getClient().createEvent({
        trackingNumber: uuid.v4(),
        timestamp: new Date().toISOString(),
        provider: 'X',
        providerStatus: 'IN TRANSIT',
        internalStatus: 'In-Transit',
        externalStatus: 'In-Transit',
        message: 'IN TRANSIT',
        location: { city: 'OKLAHOMA CITY', state: 'OK' },
        signature: null,
        signatureUrl: null,
        expectedDeliveryDate: null,
        ...args
    });
});

define('liveSegment', async (args = {}) => {
    return transport.getClient().createLiveSegment({
        provider: 'X',
        trackingNumber: uuid.v4().toUpperCase(),
        shipDate: new Date(),
        terminal: false,
        lane: [],
        ...args
    });
});

define('zipcode', async (args = {}) => {
    return zipcodes.dbset({
        zipcode: '90670',
        coordinates: {
            lng: -118.057571,
            lat: 33.923248
        },
        timezone: 'America/Los_Angeles',
        ...args
    });
});

define('source', async (args = {}) => {
    args = {
        createdAt: new Date(),
        uri: 's3://test-onelivex/kobayashi/one.csv',
        data: { foo: 'bar' },
        state: 'CREATED',
        ...args
    };

    await mongo.get().db().collection('sources').insertOne(args);
    return args;
});

define('row', async (gateway, args = {}) => {
    args = {
        createdAt: new Date(),
        rowNumber: 0,
        data: { foo: 'bar' },
        state: 'CREATED',
        ...args
    };

    if (!args.sourceId) {
        const source = await create('source', { state: 'PROCESSING' });
        args.sourceId = source._id;
    }

    await mongo.get().db().collection('rows').insertOne(args);
    return args;
});

define('expectedDeliveryDates', async (args = {}) => {
    const { timezone = 'UTC', destinationTimezone = 'America/Chicago' } = args;

    const today = DateTime.now().setZone(timezone).set({ hour: 20, minute: 0, second: 0, millisecond: 0 });
    const yesterday = today.setZone(destinationTimezone).minusBusiness({ days: 1 }).startOf('day');
    const plusOne = today.setZone(destinationTimezone).plusBusiness({ days: 1 }).startOf('day');
    const plusFour = today.setZone(destinationTimezone).plusBusiness({ days: 4 }).startOf('day');

    return {
        yesterday: yesterday.toISO(),
        today: today.toISO(),
        plusOne: plusOne.toISO(),
        plusFour: plusFour.toISO()
    };
});

// auth, identities, providers

define('identity', async (args = {}) => {
    return await Identities.dbset({
        oauthId: {
            googleId: '111111111111111111111'
        },
        displayName: 'Tom Bryant',
        email: 'tom.bryant@xdelivery.ai',
        name: {
            familyName: 'Bryant',
            givenName: 'Tom'
        },
        profilePicture: null,
        roleId: null,
        jti: null,
        refreshJti: null,
        ...args
    }
    );
});

defineFromMap({
    provider: async (args = {}) => {
        return Provider.setCredentials(
            args.name || 'LaserShip', {
                username: 'user',
                password: 'password',
                url: 'www.someapi.com',
                ...args.credentials
            });
    },
    expeditedDeliveryAuth: async () => {
        return create('provider', {
            name: CARRIER_NAMES.expeditedDelivery,
            credentials: {
                username: process.env.EXPEDITED_DELIVERY_USER,
                password: process.env.EXPEDITED_DELIVERY_PASSWORD,
                url: process.env.EXPEDITED_DELIVERY_URL
            }
        });
    },
    pillowAuth: async () => {
        return create('provider', {
            name: CARRIER_NAMES.pillowLogistics,
            credentials: {
                username: process.env.PILLOW_LOGISTICS_USER,
                password: process.env.PILLOW_LOGISTICS_PASSWORD,
                url: process.env.PILLOW_LOGISTICS_URL
            }
        });
    }
});

define('providerCreds', async (args = {}) => {
    return {
        name: 'LaserShip',
        credentials: {
            username: 'user',
            password: 'password',
            url: 'www.someapi.com'
        },
        ...args
    };
});

define('jwt', async (args = {}) => {
    const expirationTime = gconfig.jwtRefreshTokenExpiration + Math.trunc(Date.now() / 1000);
    return await jwt.sign({
        iss: 'OLX',
        jti: 'randomJTI',
        _id: '099980',
        email: 'badman@badactorinc.gov',
        roleId: 2,
        exp: expirationTime,
        ...args,
        secret: undefined
    }, args.secret || gconfig.jwtSecret);
});

define('webhook', async (args = {}) => {
    let { shipper, ...rest } = args;

    if (shipper === undefined) {
        const org = await chai.factory.create('organization');
        shipper = org.shipperSeqNum;
    }

    return await createWebhook({
        shipper,
        url: `https://www.${uuid.v4()}.com/webhook`,
        ...rest
    });
});

define('auth0User', (args = {}) => {
    return (
        {
            created_at: new Date(),
            email: 'test@xdelivery.ai',
            email_verified: false,
            identities: [
                {
                    connection: 'Username-Password-Authentication',
                    user_id: '610d449ed056750070dbf2f7',
                    provider: 'auth0',
                    isSocial: false
                }
            ],
            name: 'Test Robot',
            nickname: 'Test-Robot',
            picture: 'https://s.gravatar.com/avatar/633e35c16563387f0b960492c5295406?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fto.png',
            updated_at: new Date(),
            user_id: 'auth0|610d449ed056750070dbf2f7',
            last_login: new Date(),
            last_ip: '127.0.0.1',
            logins_count: 1000,
            family_name: 'Robot',
            given_name: 'Test',
            app_metadata: {
                organization_id: [
                    4
                ]
            },
            ...args
        });
});
