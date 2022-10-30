const { DateTime } = require('luxon');
const { expect, factory } = require('chai');
const { UnauthorizedError, ForbiddenError } = require('errors');

const { AsyncFunction } = require('../../../../app/api/lib/utils');
const { getFns, getMockRequest, testCredential, timestampFormat, toBuffer } = require('./utils');
const { getNextFn } = require('../../../helper/nextSpy');

describe('shippoAuth middleware', function () {
    describe('function initialization', function () {
        it('throws when credential missing', function () {
            const fns = () => getFns({ credential: null });
            expect(fns).to.throw('shippoAuth middleware initialization requires both credential and secret');
        });

        it('throws when secret missing', function () {
            const fns = () => getFns({ secret: null });
            expect(fns).to.throw('shippoAuth middleware initialization requires both credential and secret');
        });

        it('returns authentication and authorization functions on initialization', function () {
            const { authentication, authorization } = getFns();
            expect(authentication).to.be.instanceOf(Function);
            expect(authorization).to.be.instanceOf(AsyncFunction);
        });

        it('returns authentication and authorization functions on initialization when account tokens are disabled', function () {
            const { authentication, authorization } = getFns({ requireAccountTokens: false });
            expect(authentication).to.be.instanceOf(Function);
            expect(authorization).to.be.instanceOf(AsyncFunction);
        });
    });

    describe('authentication function', function () {
        it('succeeds with call to next', function () {
            const { authentication } = getFns();
            const { nextFn, spy } = getNextFn();
            const req = getMockRequest();

            authentication(req, {}, nextFn);

            expect(spy.counter).to.eq(1);
            expect(spy.errors.length).to.eq(0);
        });

        it('calls next() with UnauthorizedError on unauthorized request', function () {
            const { authentication } = getFns();
            const { nextFn, spy } = getNextFn();
            const req = getMockRequest({ addAuthHeader: false });

            authentication(req, {}, nextFn);

            expect(spy.counter).to.eq(1);
            expect(spy.errors.length).to.eq(1);
            expect(spy.errors[0]).to.be.instanceOf(UnauthorizedError);
        });

        it('calls next() with UnauthorizedError on unknown credential', function () {
            const { authentication } = getFns();
            const { nextFn, spy } = getNextFn();
            const req = getMockRequest({ credential: 'BAD' });

            authentication(req, {}, nextFn);

            expect(spy.counter).to.eq(1);
            expect(spy.errors.length).to.eq(1);
            expect(spy.errors[0]).to.be.instanceOf(UnauthorizedError);
        });

        it('calls next() with UnauthorizedError on mismatched secret', function () {
            const { authentication } = getFns();
            const { nextFn, spy } = getNextFn();
            const req = getMockRequest({ secret: 'bad' });

            authentication(req, {}, nextFn);

            expect(spy.counter).to.eq(1);
            expect(spy.errors.length).to.eq(1);
            expect(spy.errors[0]).to.be.instanceOf(UnauthorizedError);
        });

        it('calls next() with UnauthorizedError on fields missing from hash', function () {
            const { authentication } = getFns();
            const { nextFn, spy } = getNextFn();
            const req = getMockRequest({ requiredHeaders: ['host', 'x-shippo-date'] });

            authentication(req, {}, nextFn);

            expect(spy.counter).to.eq(1);
            expect(spy.errors.length).to.eq(1);
            expect(spy.errors[0]).to.be.instanceOf(UnauthorizedError);
        });

        it('calls next() with UnauthorizedError out of sync timestamp', function () {
            const { authentication } = getFns();
            const { nextFn, spy } = getNextFn();
            const req = getMockRequest({
                headers: { 'X-Shippo-Date': DateTime.now().minus({ days: 1 }).toFormat(timestampFormat) }
            });

            authentication(req, {}, nextFn);

            expect(spy.counter).to.eq(1);
            expect(spy.errors.length).to.eq(1);
            expect(spy.errors[0]).to.be.instanceOf(UnauthorizedError);
        });

        it('calls next() with UnauthorizedError on mismatched body', function () {
            const { authentication } = getFns();
            const { nextFn, spy } = getNextFn();
            const req = getMockRequest();
            req.body = '123';

            authentication(req, {}, nextFn);

            expect(spy.counter).to.eq(1);
            expect(spy.errors.length).to.eq(1);
            expect(spy.errors[0]).to.be.instanceOf(UnauthorizedError);
        });
    });

    describe('authorization function', function () {
        it('authorization fails if authentication not called before', async function () {
            const { authorization } = getFns();
            const { nextFn, spy } = getNextFn();
            const req = getMockRequest();

            await authorization(req, {}, nextFn);

            expect(spy.counter).to.eq(1);
            expect(spy.errors.length).to.eq(1);
        });

        it('calls next() with ForbiddenError on missing AccountToken header', async function () {
            const { authentication, authorization } = getFns();
            const { nextFn, spy } = getNextFn();
            const req = getMockRequest();
            const res = {};

            authentication(req, res, nextFn);
            await authorization(req, res, nextFn);

            expect(spy.counter).to.eq(2);
            expect(spy.errors.length).to.eq(1);
            expect(spy.errors[0]).to.be.instanceOf(ForbiddenError);
        });

        it('calls next() with ForbiddenError on missing account_id', async function () {
            const { authentication, authorization } = getFns();
            const { nextFn, spy } = getNextFn();
            const req = getMockRequest();
            const res = {};

            authentication(req, res, nextFn);
            await authorization(req, res, nextFn);

            expect(spy.counter).to.eq(2);
            expect(spy.errors.length).to.eq(1);
            expect(spy.errors[0]).to.be.instanceOf(ForbiddenError);
        });

        it('calls next() with ForbiddenError on unmatching account_id', async function () {
            const { authentication, authorization } = getFns();
            const { nextFn, spy } = getNextFn();

            const req = getMockRequest({
                body: toBuffer({ account: { account_id: 'badaccount' } }),
                headers: { AccountToken: 'notused' }
            });
            const res = {};

            authentication(req, res, nextFn);
            await authorization(req, res, nextFn);

            expect(spy.counter).to.eq(2);
            expect(spy.errors.length).to.eq(1);
            expect(spy.errors[0]).to.be.instanceOf(ForbiddenError);
        });

        it('calls next() with ForbiddenError on unmatching AccountToken header', async function () {
            const { authentication, authorization } = getFns();
            const { nextFn, spy } = getNextFn();

            const org = await factory.create('organization');
            const { apiId } = org;

            const req = getMockRequest({
                body: toBuffer({ account: { account_id: apiId } }),
                headers: { AccountToken: 'badtoken' }
            });
            const res = {};

            authentication(req, res, nextFn);
            await authorization(req, res, nextFn);

            expect(spy.counter).to.eq(2);
            expect(spy.errors.length).to.eq(1);
            expect(spy.errors[0]).to.be.instanceOf(ForbiddenError);
        });
    });

    describe('auth interactions', function () {
        const res = {};

        it('succeeds authentication and authorization', async function () {
            const { authentication, authorization } = getFns();
            const { nextFn, spy } = getNextFn();

            const org = await factory.create('organization');
            const { apiId, apiKey } = org;

            const req = getMockRequest({
                // the authentication middleware expects body to be a raw Buffer
                body: toBuffer({ account: { account_id: apiId } }),
                headers: { AccountToken: apiKey }
            });

            authentication(req, res, nextFn);
            await authorization(req, res, nextFn);

            expect(spy.counter).to.eq(2);
            expect(spy.errors.length).to.eq(0);
            expect(req.shippo.auth.credential).to.eq(testCredential);
            expect(req.shippo.auth.accountId).to.eq(apiId);
        });

        it('authorization succeeds with no account tokens configured', async function () {
            const { authentication, authorization } = getFns({ requireAccountToken: false });
            const { nextFn, spy } = getNextFn();
            const req = getMockRequest();

            authentication(req, res, nextFn);
            await authorization(req, res, nextFn);

            expect(spy.counter).to.eq(2);
            expect(spy.errors.length).to.eq(0);
            expect(req.shippo.auth.credential).to.eq(testCredential);
        });
    });
});
