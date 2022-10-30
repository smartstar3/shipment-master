const { expect, factory } = require('chai');

const Roles = require('../../../app/models/roles');
const {
    getShipmentByTrackingNumber,
    getShipmentFilters,
    getShipmentsByAdmin,
    getShipmentsByUser,
    getTotalShipmentCountByUser
} = require('../../../app/controllers/graphql/shipment');

describe('Shipment Controller', () => {
    describe('getShipmentsByAdmin', () => {
        it('return created shipments ', async () => {
            const shipment1 = await factory.create('shipment', {
                docs: [{ doc: { Barcode: 'UDS1234' }, vendor: 'UDS' }]
            });
            const shipment2 = await factory.create('shipment', {
                docs: [{ doc: { Barcode: 'UDS1239' }, vendor: 'UDS' }]
            });

            const shipment3 = await factory.create('shipment', {
                docs: [{ doc: { uspsTN: '921234' }, vendor: 'USPS' }]
            });
            const args = { sorting: { field: 'created_date', order: 1 } };

            const { shipments } = await getShipmentsByAdmin(args);

            expect(shipments[0].tn).to.eq(shipment1.tn);
            expect(shipments[1].tn).to.eq(shipment2.tn);
            expect(shipments[2].tn).to.eq(shipment3.tn);
        });

        it('returns hasMore true if more records exist ', async () => {
            const count = 2;
            await factory.create('shipment', {
                docs: [{ doc: { Barcode: 'UDS1234' }, vendor: 'UDS' }]
            });
            await factory.create('shipment', {
                docs: [{ doc: { Barcode: 'UDS1239' }, vendor: 'UDS' }]
            });
            await factory.create('shipment', {
                docs: [{ doc: { uspsTN: '921234' }, vendor: 'USPS' }]
            });
            const args = { count: count, sorting: { field: 'created_date', order: 1 } };

            const { shipments, hasMore } = await getShipmentsByAdmin(args);
            expect(shipments.length).to.eq(count);
            expect(hasMore).to.eq(true);
        });

        it('returns hasMore true if false if no more  records exist ', async () => {
            const count = 3;
            await factory.create('shipment', {
                docs: [{ doc: { Barcode: 'UDS1234' }, vendor: 'UDS' }]
            });
            await factory.create('shipment', {
                docs: [{ doc: { Barcode: 'UDS1239' }, vendor: 'UDS' }]
            });
            await factory.create('shipment', {
                docs: [{ doc: { uspsTN: '921234' }, vendor: 'USPS' }]
            });
            const args = { count: count, sorting: { field: 'created_date', order: 1 } };

            const { shipments, hasMore } = await getShipmentsByAdmin(args);
            expect(shipments.length).to.eq(count);
            expect(hasMore).to.eq(false);
        });

        it('returns hasMore false if less than the requested records exist ', async () => {
            const count = 10;
            await factory.create('shipment', {
                docs: [{ doc: { Barcode: 'UDS1234' }, vendor: 'UDS' }]
            });
            await factory.create('shipment', {
                docs: [{ doc: { Barcode: 'UDS1239' }, vendor: 'UDS' }]
            });
            await factory.create('shipment', {
                docs: [{ doc: { uspsTN: '921234' }, vendor: 'USPS' }]
            });
            const args = { count: count, sorting: { field: 'created_date', order: 1 } };

            const { shipments, hasMore } = await getShipmentsByAdmin(args);
            expect(shipments.length).to.be.lessThan(count);
            expect(hasMore).to.eq(false);
        });
    });

    describe('getShipmentsByUser', () => {
        it('return shipments which is created by the user ', async () => {
            const organization = await factory.create('organization');
            const role = await factory.create('role', { authLevel: Roles.AUTH_ADMIN });
            const user = await factory.create('user', {
                roleId: role._id,
                organizationId: organization._id
            });

            // Create shipment related to the user
            const shipment1 = await factory.create('shipment', {
                shipper: organization.shipperSeqNum,
                docs: [{ doc: { Barcode: 'UDS1234' }, vendor: 'UDS' }]
            });

            // Create other shipment
            await factory.create('shipment', {
                docs: [{ doc: { Barcode: 'UDS1239' }, vendor: 'UDS' }]
            });

            // Create shipment related to the user
            const shipment3 = await factory.create('shipment', {
                shipper: organization.shipperSeqNum,
                docs: [{ doc: { uspsTN: '921234' }, vendor: 'USPS' }]
            });

            // add user context
            const context = { user };
            const args = { sorting: { field: 'created_date', order: 1 } };

            const shipments = await getShipmentsByUser(args, context);
            expect(shipments[0].tn).to.eq(shipment1.tn);
            expect(shipments[1].tn).to.eq(shipment3.tn);
        });
    });

    describe('getTotalShipmentCountByUser', () => {
        it('Total count should be 1', async () => {
            const organization = await factory.create('organization');
            const role = await factory.create('role', { authLevel: Roles.AUTH_ADMIN });
            const user = await factory.create('user', {
                roleId: role._id,
                organizationId: organization._id
            });

            // Create shipment related to the user with UDS
            await factory.create('shipment', {
                shipper: organization.shipperSeqNum,
                docs: [{ doc: { Barcode: 'UDS1234' }, vendor: 'UDS' }]
            });

            // Create other shipment with UDS
            await factory.create('shipment', {
                vendor: 'VENDOR',
                docs: [{ doc: { Barcode: 'UDS1239' }, vendor: 'UDS' }]
            });

            // Create shipment related to the user, but not UDS
            await factory.create('shipment', {
                shipper: organization.shipperSeqNum,
                docs: [{ doc: { uspsTN: '921234' }, vendor: 'USPS' }]
            });

            const totalCount = await getTotalShipmentCountByUser(null, { user });
            expect(totalCount).to.eq(2);
        });

        it('Total count should be 1 by UDS vendor filter', async () => {
            const organization = await factory.create('organization');
            const role = await factory.create('role', { authLevel: Roles.AUTH_ADMIN });
            const user = await factory.create('user', {
                roleId: role._id,
                organizationId: organization._id
            });

            // Create shipment related to the user with UDS
            await factory.create('shipment', {
                shipper: organization.shipperSeqNum,
                docs: [{ doc: { Barcode: 'UDS1234' }, vendor: 'UDS' }]
            });

            // Create other shipment with UDS
            await factory.create('shipment', {
                vendor: 'VENDOR',
                docs: [{ doc: { Barcode: 'UDS1239' }, vendor: 'UDS' }]
            });

            // Create shipment related to the user, but not UDS
            await factory.create('shipment', {
                shipper: organization.shipperSeqNum,
                docs: [{ doc: { uspsTN: '921234' }, vendor: 'USPS' }]
            });

            const totalCount = await getTotalShipmentCountByUser({ vendor: 'uds' }, { user });
            expect(totalCount).to.eq(1);
        });
    });

    describe('getShipmentByTrackingNumber', () => {
        it('should return shipment by matched tracking number', async () => {
            const shipment1 = await factory.create('shipment', {
                docs: [{ doc: { Barcode: 'UDS1234' }, vendor: 'UDS' }]
            });

            const shipment = await getShipmentByTrackingNumber({ trackingNum: shipment1.tn });
            expect(shipment.tn).to.eq(shipment1.tn);
        });

        it('should return null by unmatched tracking number', async () => {
            const shipment = await getShipmentByTrackingNumber({ trackingNum: 'invalid' });
            expect(shipment).to.eq(null);
        });
    });

    describe('getShipmentFilters', () => {
        const ORG_FILTERS = ['orgOne', 'orgTwo'];
        const VENDOR_FILTERS = ['vendorOne', 'vendorTwo', 'vendorThree'];

        beforeEach(async () => {
            await factory.create('organization', { shipperSeqNum: 1, name: ORG_FILTERS[0] });
            await factory.create('organization', { shipperSeqNum: 2, name: ORG_FILTERS[1] });

            await factory.create('shipment', { shipper: 1, docs: [{ vendor: VENDOR_FILTERS[0] }] });
            await factory.create('shipment', { shipper: 1, docs: [{ vendor: VENDOR_FILTERS[1] }] });
            await factory.create('shipment', { shipper: 2, docs: [{ vendor: VENDOR_FILTERS[0] }] });
        });

        it('should return all filters for shipments under a given orgs shipperSeqNum', async () => {
            const res = await getShipmentFilters({ organizationScope: [1, 2] });
            expect(res.organizations).to.include(ORG_FILTERS[0]);
            expect(res.organizations).to.include(ORG_FILTERS[1]);
            expect(res.carriers).to.include(VENDOR_FILTERS[1]);
            expect(res.carriers).to.include(VENDOR_FILTERS[0]);
            expect(res.carriers).to.not.include(VENDOR_FILTERS[2]);
        });

        it('should return no organizations or vendors if no shipments exist for that shipper', async () => {
            const res = await getShipmentFilters({ organizationScope: [0] });
            expect(res.organizations.length).to.eq(0);
            expect(res.carriers.length).to.eq(0);
        });

        it('should succesfully scope results to organization scope', async () => {
            const res = await getShipmentFilters({ organizationScope: [2] });
            expect(res.organizations).to.not.include(ORG_FILTERS[0]);
            expect(res.organizations).to.include(ORG_FILTERS[1]);
            expect(res.carriers).to.not.include(VENDOR_FILTERS[1]);
            expect(res.carriers).to.include(VENDOR_FILTERS[0]);
            expect(res.carriers).to.not.include(VENDOR_FILTERS[2]);
        });
    });
});
