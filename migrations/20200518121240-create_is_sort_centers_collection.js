// migrations/ls_sort_center -- initial migration to crate and seed ls_sort_centers collection
//
'use strict';
// initialize logger first
const { getModuleContext, initialize } = require('@onelive-dev/x-logger');

const logger = initialize({ context: getModuleContext(module) });

const lsSortCenters = require('./../app/models/lsSortCenters');
const mongo = require('../app/helpers/mongo');

const seedData = [
    {
        CustomerBranch: 'ONELIVSB', // South Brunswick/Dayton NJ: Perishable goods, no pickup
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
        }
    },
    {
        CustomerBranch: 'ONELIVNP', // South Brunswick/Dayton NJ: Non-perishable goods, no pickup
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
        }
    },
    {
        CustomerBranch: 'ONELIJFK', // JFK
        PickupType: 'LaserShip',
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
        }
    },
    {
        CustomerBranch: 'ONELIEWR', // Newark
        PickupType: 'LaserShip',
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
        }
    },
    {
        CustomerBranch: 'ONELICHR', // Charlotte
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
            Address: '1816 W POINTE DR',
            Address2: '',
            PostalCode: '28214-9284',
            City: 'CHARLOTTE',
            State: 'NC',
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
            Address: '7000 BURLESON RD ',
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
        }
    },
    {
        CustomerBranch: 'ONELIURB', // Groveport
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
            Address: '2950 TOY RD',
            Address2: '',
            PostalCode: '43125-7506',
            City: 'GROVEPORT',
            State: 'OH',
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
            Address: '7000 BURLESON RD ',
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
        }
    },
    {
        CustomerBranch: 'ONELIORL', // Orlando
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
            Address: '2900 TITAN ROW',
            Address2: '',
            PostalCode: '32809-5691',
            City: 'ORLANDO',
            State: 'FL',
            Country: 'US',
            Phone: '(856) 252-0203',
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
            Address: '7000 BURLESON RD ',
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
        }
    },
    {
        CustomerBranch: 'ONELILGA', // La Guardia
        PickupType: 'LaserShip',
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
            Address: '7000 BURLESON RD ',
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
        }
    }
];

module.exports = {
    async up () {
        await mongo.connect();

        logger.info('ls_sort_centers');
        await lsSortCenters.create();

        logger.info('ls_sort_centers');
        for (const lsrec of seedData) {
            logger.info('ls_sort_center_seed', { CustomerBranch: lsrec.CustomerBranch });
            await lsSortCenters.dbset(lsrec);
        }
    },

    async down () {
        await mongo.connect();

        logger.info('dropping ls_sort_centers');
        await lsSortCenters.drop();
    }
};
