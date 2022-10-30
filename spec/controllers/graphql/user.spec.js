const userController = require('../../../app/controllers/graphql/user');
const userRepo = require('../../../app/repositories/graphql/users');

const { AccountManagementError } = require('account-management');
const { expect, factory } = require('chai');
const { resolvers } = require('../../../app/api/internal/graphql/types/admin/users');

describe('Graphql User Controller', () => {
    describe('admin user resolver', () => {
        it('users query resolves', async () => {
            const res = await resolvers.Viewrec.users();
            expect(res.length).to.be.gt(0);
        });

        it('createUser mutation resolves with only required fields', async () => {
            const user = {
                email: 'test123@xdelivery.ai',
                shipperSeqNum: 4
            };
            const res = await resolvers.Mutation.createUser(user);
            expect(res.email).eq(user.email);
            expect(res.app_metadata.organization_id[0]).to.eq(user.shipperSeqNum);
        });

        it('createUser mutation resolves with required and optional fields', async () => {
            const user = {
                email: 'test124@xdelivery.ai',
                shipperSeqNum: 4,
                firstName: 'test',
                lastName: 'Robot'
            };

            const res = await resolvers.Mutation.createUser(user);
            expect(res.email).eq(user.email);
            expect(res.app_metadata.organization_id[0]).to.eq(user.shipperSeqNum);
            expect(res.given_name).to.eq(user.firstName);
            expect(res.family_name).to.eq(user.lastName);
        });

        it('createUser mutation does not resolve without required fields', async () => {
            const user = {
                firstName: 'test',
                lastName: 'Robot'
            };
            await expect(resolvers.Mutation.createUser(user)).to.be.rejectedWith(AccountManagementError);
        });
    });

    describe('user controller', () => {
        it('returns users from Auth0', async () => {
            const res = await userController.getUsers();
            expect(res.length).to.be.gt(0);
        });
    });

    describe('user repo', () => {
        it('formats users correctly', async () => {
            const org = await factory.create('organization', { shipperSeqNum: 10 });
            const Auth0User = factory.create('auth0User', { app_metadata: { organization_id: [org.shipperSeqNum] } });
            const res = await userRepo.formatUsers([org], [Auth0User]);
            expect(res[0]).to.deep.eq({
                emailVerified: Auth0User.email_verified,
                email: Auth0User.email,
                familyName: Auth0User.family_name,
                givenName: Auth0User.given_name,
                name: Auth0User.name,
                nickname: Auth0User.nickname,
                id: Auth0User.user_id,
                loginsCount: Auth0User.logins_count,
                lastLogin: Auth0User.last_login,
                shipperSeqNum: Auth0User.app_metadata.organization_id[0],
                organization: { ...org }
            });
        });
    });
});
