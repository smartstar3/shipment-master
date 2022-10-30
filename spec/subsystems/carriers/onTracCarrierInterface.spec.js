const onTracCarrierInterface = require('../../../app/subsystems/carriers/onTracCarrierInterface');
const { expect, factory } = require('chai');

describe('OnTrac Carrier Interface Test', () => {
    describe('createOrder', () => {
        it('successfully creates labels for BuiltBar', async () => {
            const zipZone = await factory.create('ontracZipZone');
            const zip = zipZone.zipcode;
            const org = await factory.create('organization', { name: 'BuiltBar' });
            const params = await factory.create('orderRequest', {
                to_address: { zip },
                shipper_name: 'OneLiveX'
            });

            return onTracCarrierInterface.createOrder(zipZone, params, org).then(
                (res) => {
                    expect(res.Label).not.to.eq(undefined);
                    expect(res.Label).to.be.a('string');
                }
            );
        });

        it('successfully creates labels For RentTheRunway', async () => {
            const zipZone = await factory.create('ontracZipZone');
            const zip = zipZone.zipcode;
            const org = await factory.create('organization', { name: 'RentTheRunway' });
            const params = await factory.create('orderRequest', {
                to_address: { zip },
                shipper_name: 'OneLiveX'
            });

            return onTracCarrierInterface.createOrder(zipZone, params, org).then(
                (res) => {
                    expect(res.Label).not.to.eq(undefined);
                    expect(res.Label).to.be.a('string');
                }
            );
        });
    });
});
