// migrations/create_user_collecition -- initial migration to create and seed the following models
//
// roles -- user roles and auth level
// organizations -- companies users might be assocated with
// users -- user details and login credentials
//
'use strict';
const argon2 = require('argon2');
const mongodb = require('mongodb'); // base mongo object to be able to call ObjectId()

// initialize logger first
const { getModuleContext, initialize } = require('@onelive-dev/x-logger');

const logger = initialize({ context: getModuleContext(module) });

const apiKeyFunc = require('./../app/helpers/apiKeyFuncs');
const mongo = require('../app/helpers/mongo');
const organizations = require('./../app/models/organizations');
const roles = require('./../app/models/roles');
const sequence = require('./../app/models/sequence');
const users = require('./../app/models/users');

const seedData = {
    roles: [
        {
            name: 'Admin',
            authLevel: roles.setAdmin(),
            description: 'System Administrator'
        },
        {
            name: 'User',
            authLevel: roles.setUser(),
            description: 'System User'
        }
    ],
    organizations: [
        {
            name: 'FashionNova',
            type: 'Shipper',
            shipperSeqNum: 0, // filled in later
            description: '',
            address: '2801 E. 46th St.',
            city: 'Vernon',
            state: 'CA',
            zip: '90058',
            contactName: '',
            contactPhone: '',
            contactEmail: '',
            apiId: apiKeyFunc.generateApiId(),
            apiKey: apiKeyFunc.generateApiKey()
        },
        {
            name: 'GetMaineLobster',
            type: 'Shipper',
            shipperSeqNum: 0, // filled in later
            description: '',
            address: '392 Fore St.',
            city: 'Portland',
            state: 'ME',
            zip: '04101',
            contactName: '',
            contactPhone: '',
            contactEmail: '',
            apiId: apiKeyFunc.generateApiId(),
            apiKey: apiKeyFunc.generateApiKey()
        },
        {
            name: 'BuiltBar',
            type: 'Shipper',
            shipperSeqNum: 0, // filled in later
            description: '',
            address: 'PO Box 1703',
            city: 'Spanish Fork',
            state: 'UT',
            zip: '84660',
            contactName: '',
            contactPhone: '',
            contactEmail: '',
            apiId: apiKeyFunc.generateApiId(),
            apiKey: apiKeyFunc.generateApiKey()
        },
        {
            name: 'OneLiveX',
            type: 'HQ',
            shipperSeqNum: 0, // filled in later
            description: '',
            address: '410 Baylor St',
            city: 'Austin',
            state: 'TX',
            zip: '78703',
            contactName: 'Chris Guggenheim',
            contactPhone: '',
            contactEmail: 'chris@onelive.com',
            apiId: apiKeyFunc.generateApiId(),
            apiKey: apiKeyFunc.generateApiKey()
        }
    ],
    users: [
        {
            firstname: '',
            lastname: '',
            email: 'foo@bar.com',
            password: 'password', // will be encrypted before save
            roleId: 'Admin', // will be converted to DB id before save
            organizationId: 'OneLiveX' // will be converted to DB id before save
        },
        {
            firstname: '',
            lastname: '',
            email: 'test@user.com',
            password: 'testpassword', // will be encrypted before save
            roleId: 'User', // will be converted to DB id before save
            organizationId: ''
        }
    ]
};

// prepare and save organization document
async function seedOrg (orgDoc) {
    orgDoc._id = mongodb.ObjectId(); // create the _id for this document

    if (orgDoc.type === 'Shipper') {
        // create a new sequence number based on OID
        orgDoc.shipperSeqNum = await sequence.nextseq('Shippers', orgDoc._id.toString());
    }

    await organizations.dbset(orgDoc);
}

// prepare and save user doc
async function seedUser (urec) {
    urec.password = await argon2.hash(urec.password);
    const orec = await organizations.dbget({ name: urec.organizationId });
    urec.organizationId = orec ? orec._id : null;
    const rrec = await roles.dbget({ name: urec.roleId });
    urec.roleId = rrec ? rrec._id : null;
    await users.dbset(urec);
}

module.exports = {
    async up () {
        await mongo.connect();

        logger.info('Creating roles');
        await roles.create();

        logger.info('Seeding roles');
        for (const role of seedData.roles) {
            await roles.dbset(role);
        }

        logger.info('Creating organizations');
        await organizations.create();

        logger.info('Seeding organizations');
        for (const organization of seedData.organizations) {
            await seedOrg(organization);
        }

        logger.info('Creating users');
        await users.create();

        logger.info('Seeding users');
        for (const user of seedData.users) {
            await seedUser(user);
        }
    },

    async down () {
        await mongo.connect();

        logger.info('Dropping roles, organizations, and users');
        await roles.drop();
        await organizations.drop();
        await users.drop();
    }
};
