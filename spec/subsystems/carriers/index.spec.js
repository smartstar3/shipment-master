const { expect, factory } = require('chai');

const DispatchScience = require('dispatch-science');

const {
    carrierInterfaces,
    DispatchScienceCarrier,
    DispatchScienceInterface
} = require('../../../app/subsystems/carriers/index');
const { CARRIER_NAMES } = require('../../../app/constants/carrierConstants');

const { pillowLogistics } = CARRIER_NAMES;

const AsyncFunction = (async () => {}).constructor;

const setAuthProvider = async () => factory.create('pillowAuth');

describe('carrier subsystem', () => {
    describe('carrierInterfaces', () => {
        it('all CARRIER_NAMES match carrierInterfaces props', () => {
            const names = Object.values(CARRIER_NAMES);
            const interfaceKeys = Object.keys(carrierInterfaces);

            expect(names.length).to.equal(interfaceKeys.length);
            expect(carrierInterfaces).to.have.all.keys(...names);
        });
    });

    describe('DispatchScienceCarrier', () => {
        it('returns DispatchScience instance with valid carrier', async () => {
            await setAuthProvider();
            const inst = await DispatchScienceCarrier(pillowLogistics);

            expect(inst).to.be.instanceOf(DispatchScience);
        });
    });

    describe('DispatchScienceInterface', () => {
        it('returns expected object with createOrder method', async () => {
            await setAuthProvider();
            const obj = DispatchScienceInterface(pillowLogistics);

            expect(obj).to.be.instanceOf(Object);
            expect(obj.createOrder).to.be.instanceOf(AsyncFunction);
        });
    });
});
