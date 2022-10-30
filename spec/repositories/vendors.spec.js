const vendorRepo = require('../../app/repositories/vendors');
const { CARRIER_NAMES } = require('../../app/constants/carrierConstants');
const { expect } = require('chai');

describe('Shipment Repository', () => {
    it('Vendors should be matched with Carrier Names', async () => {
        const vendors = vendorRepo.getVendors();
        expect(vendors[0].name).to.eql(CARRIER_NAMES[vendors[0].id]);
        expect(vendors[1].name).to.eql(CARRIER_NAMES[vendors[1].id]);
        expect(vendors[2].name).to.eql(CARRIER_NAMES[vendors[2].id]);
        expect(vendors[3].name).to.eql(CARRIER_NAMES[vendors[3].id]);
    });
});
