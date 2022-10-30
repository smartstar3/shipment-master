const { expect, factory } = require('chai');

const {
    getZipZone,
    getZipZones,
    getTerminalProviders,
    getZipCodesByShipperId
} = require('../../app/repositories/zipZones');

describe('zipZone repository', async () => {
    describe('getZipZones', async () => {
        let zipZone1;
        let zipZone2;

        beforeEach(async () => {
            zipZone1 = await factory.create('zipZone', { carrier: 'testCarrier', zipcode: '90210' });
            zipZone2 = await factory.create('zipZone', { carrier: 'carrierTest', zipcode: '90210' });
            await factory.create('zipZone', { carrier: 'carrierTest2', zipcode: '90210' });
        });

        it('get all matching records', async () => {
            const result = await getZipZones({
                searchWord: '90210',
                carrier: ['testCarrier', 'carrierTest']
            });

            const {
                _id: firstId,
                ...rest1
            } = zipZone1;

            const {
                _id: secondId,
                ...rest2
            } = zipZone2;

            expect(result).to.have.length(2);
            expect(result).to.deep.eq([{ id: firstId, ...rest1 }, { id: secondId, ...rest2 }]);
        });

        it('skip the first record', async () => {
            const result = await getZipZones({
                start: 1,
                searchWord: '90210',
                carrier: ['testCarrier', 'carrierTest']
            });

            expect(result).to.have.length(1);
        });

        it('limit number of records', async () => {
            const result = await getZipZones({
                count: 1,
                searchWord: '90210',
                carrier: ['testCarrier', 'carrierTest']
            });

            expect(result).to.have.length(1);
        });
    });

    describe('getZipCodesByShipperId', () => {
        it('get all zipzones by shipper id', async () => {
            const org1 = await factory.create('organization');
            await factory.create('zipZone', { shipper_id: org1.shipperSeqNum, zipcode: '75243' });
            await factory.create('zipZone', { shipper_id: org1.shipperSeqNum, zipcode: '75244' });
            await factory.create('zipZone', { shipper_id: org1.shipperSeqNum, zipcode: '75245' });

            const org2 = await factory.create('organization');
            await factory.create('zipZone', { shipper_id: org2.shipperSeqNum });
            await factory.create('zipZone', { shipper_id: org2.shipperSeqNum });
            await factory.create('zipZone', { shipper_id: org2.shipperSeqNum });

            const response = await getZipCodesByShipperId(org1.shipperSeqNum);
            expect(response).to.have.length(3);
        });

        it('get zipzones by wrong shipper id', async () => {
            const org1 = await factory.create('organization');
            await factory.create('zipZone', { shipper_id: org1.shipperSeqNum });
            await factory.create('zipZone', { shipper_id: org1.shipperSeqNum });
            await factory.create('zipZone', { shipper_id: org1.shipperSeqNum });

            const org2 = await factory.create('organization');
            const response = await getZipCodesByShipperId(org2.shipperSeqNum);
            expect(response).to.have.length(0);
        });
    });

    describe('getZipzone', async () => {
        it('returns a specific zipzone by id', async () => {
            const firstZipZone = await factory.create('zipZone', { carrier: 'testCarrier', zipcode: '90210' });
            await factory.create('zipZone', { carrier: 'carrierTest', zipcode: '90210' });
            const response = await getZipZone({ _id: firstZipZone._id });
            expect(response).to.deep.eq(firstZipZone);
        });

        it('returns null if zipzone is not found', async () => {
            await factory.create('zipZone', { carrier: 'testCarrier', zipcode: '90210' });
            const response = await getZipZone({ _id: '61158de597ec7ae956bd5519' });
            expect(response).to.eq(null);
        });
    });

    describe('getTerminalProviders', () => {
        it('get all providers', async () => {
            const org = await factory.create('organization');
            await factory.create('zipZone', { shipper_id: org.shipperSeqNum });
            await factory.create('zipZone', { shipper_id: org.shipperSeqNum });
            await factory.create('zipZone', { shipper_id: org.shipperSeqNum });

            const result = await getTerminalProviders();
            expect(result[0]).to.deep.eql({ count: 3, id: 'testCarrier' });
        });
    });
});
