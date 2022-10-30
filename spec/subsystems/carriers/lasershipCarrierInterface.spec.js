// test - subsystems/LaserShipCarrierInterface
//
'use strict';

const laserShipCarrierInterface = require('./../../../app/subsystems/carriers/lasershipCarrierInterface');
const { expect, factory } = require('chai');

const params = {
    shipper_name: 'Dmitry',
    shipper_phone: '14353452341',
    reference_id: '231434567456',
    reference_data: 'reference description',
    to_address: {
        name: 'my home',
        address1: '100 S Van Buren St',
        address2: '101 S Van Buren St',
        city: 'Shipshewana',
        state: 'IN',
        zip: '01267',
        country: 'US',
        phone: '1368453542'
    },
    from_address: {
        name: 'my office',
        address1: '8487 Middle St',
        address2: '8488 S Van Buren St',
        city: 'Stinesville',
        state: 'IN',
        zip: '01106',
        country: 'US',
        phone: '1368453542'
    },
    parcel: {
        description: 'my t-shirt',
        length: '12.4',
        width: '10.0',
        height: '4.0',
        weight: '6.0',
        value: '10.06',
        attributes: {},
        reference: '324234532'
    },
    label_format: 'P4x6'
};

describe('LaserShip Carrier Interface Test', () => {
    describe('Create Order Test', () => {
        it('should create order', async () => {
            const zipZone = await factory.create('lasershipZipZone');
            const order = await laserShipCarrierInterface.createOrder(zipZone, params);

            expect(order.CustomerBranch).to.equal(zipZone.options.customerBranch);
            expect(order.Pieces.length).to.equal(1);
            expect(order.Reference1).to.equal(params.reference_id);
        });

        it('should fail with invalid carrier missing customerBranch', async () => {
            const zipZone = {
                zipcode: '01267',
                injection: 'SBSC',
                carrier: 'LaserShip',
                options: {
                }
            };

            await expect(
                laserShipCarrierInterface.createOrder(zipZone, params)
            ).to.be.rejectedWith('Invalid CustomerBranch ID');
        });

        it('should fail with invalid params', async () => {
            const {
                to_address: toAddress,
                parcel,
                label_format: labelFormat,
                shipper_phone: shipperPhone,
                reference_id: referenceId,
                reference_data: referenceData
            } = params;

            const zipZone = await factory.create('lasershipZipZone');

            const orderParams = {
                to_address: toAddress,
                parcel,
                label_format: labelFormat,
                shipper_phone: shipperPhone,
                reference_id: referenceId,
                reference_data: referenceData,
                from_address: {
                    address1: '8487 Middle St',
                    address2: '8488 S Van Buren St',
                    city: 'Stinesville',
                    state: 'IN',
                    zip: '01106',
                    country: 'US',
                    phone: '1368453542'
                }
            };

            await expect(
                laserShipCarrierInterface.createOrder(zipZone, orderParams)
            ).to.be.rejectedWith('"OrderedBy.Name" is required');
        });
    });
});
