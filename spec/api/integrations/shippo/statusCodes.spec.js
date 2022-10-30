const { expect } = require('chai');
const { STATUSES, EXTERNAL_STATUSES } = require('@onelive-dev/transport');

const { internalStatusMap, externalStatusMap } = require('../../../../app/api/integrations/shippo/statusCodes');

describe('shippo status codes', function () {
    describe('internalStatusMap has expected keys and values', function () {
        Object.entries(STATUSES).forEach(([key, value]) => {
            if (value.hidden === true) return;

            it(`key '${key}'`, function () {
                const statusObj = internalStatusMap[key];

                expect(statusObj).to.be.instanceOf(Object);
                expect(statusObj.message).to.eq(value.message);
                expect(statusObj.status).to.be.oneOf(['pre-transit', 'transit', 'delivered', 'failure', 'returned', 'unknown']);
                expect(statusObj.statusCode).to.be.a('string').that.is.not.empty;
                expect(statusObj.externalStatus).to.be.a('string').that.is.not.empty;
            });
        });
    });

    describe('externalStatusMap has expected keys and values', function () {
        EXTERNAL_STATUSES.forEach((key) => {
            it(`key '${key}'`, function () {
                const status = externalStatusMap[key];

                expect(status).to.be.oneOf(['pre-transit', 'transit', 'delivered', 'failure', 'returned', 'unknown']);
            });
        });
    });
});
