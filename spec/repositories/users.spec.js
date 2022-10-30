const Roles = require('../../app/models/roles');
const { expect, factory } = require('chai');
const { getUserWithOrganization, resetUserPassword } = require('../../app/repositories/users');

describe('User Repository', () => {
    describe('isAdmin method', () => {
        it('should return false if user is not admin', async () => {
            const user = await factory.create('user');
            expect(await Roles.isAdmin(user.roleId)).to.eq(false);
        });

        it('should return true if user is admin', async () => {
            const user = await factory.create('admin');
            expect(await Roles.isAdmin(user.roleId)).to.eq(true);
        });
    });

    describe('isUser method', () => {
        it('should return true if user is not admin', async () => {
            const user = await factory.create('user');
            expect(await Roles.isUser(user.roleId)).to.eq(true);
        });

        it('should return false if user is admin', async () => {
            const user = await factory.create('admin');
            expect(await Roles.isUser(user.roleId)).to.eq(false);
        });
    });

    describe('getUserWithOrganization method', () => {
        it('returns null if not existed', async () => {
            expect(await getUserWithOrganization('6010309fd85ca30ddca30512')).to.eq(null);
        });

        it('return user if id matched', async () => {
            const user = await factory.create('user', {
                firstname: 'testName'
            });
            const res = await getUserWithOrganization(user._id);
            expect(res.firstname).to.eq('testName');
            expect(res.organizations).not.to.eq(undefined);
        });
    });

    describe('resetUserPassword method', () => {
        it('should reset user password', async () => {
            const user = await factory.create('user', {
                password: 'testPassword'
            });

            const res = await resetUserPassword({
                id: user._id,
                oldPassword: 'testPassword',
                newPassword: 'newPassword'
            });
            expect(res).to.eq('Password reset successfully.');
        });
    });
});
