const { expect, factory } = require('chai');

const organizationRepo = require('../../app/repositories/organizations');

describe('Organization Repository', () => {
    describe('getOrganizations', () => {
        it('return [] if nothing found', async () => {
            const args = {
                searchWord: 'test'
            };

            return organizationRepo.getOrganizations(args).then(
                (res) => {
                    expect(res).to.length(0);
                },
                (e) => {
                    throw e;
                }
            );
        });

        it('return organization by email search', async () => {
            await factory.create(
                'organization',
                { contactEmail: 'testemail@xdelivery.ai' }
            );

            const args = { searchWord: 'testemail@xdelivery' };

            return organizationRepo.getOrganizations(args).then(
                (res) => {
                    expect(res).to.length(1);
                },
                (e) => {
                    throw e;
                }
            );
        });

        it('return organization by name search', async () => {
            await factory.create(
                'organization',
                { name: 'testOrgName' }
            );

            const args = { searchWord: 'testOrg' };

            return organizationRepo.getOrganizations(args).then(
                (res) => {
                    expect(res).to.length(1);
                },
                (e) => {
                    throw e;
                }
            );
        });
    });

    describe('createOrganization', () => {
        it('should create organization with timestamp', async () => {
            await factory.create('sequence', { name: 'Shippers' });
            const args = {
                name: 'testOrganization',
                type: 'HQ',
                contactEmail: 'test@test.com'
            };

            return organizationRepo.createOrganization(args).then(
                (res) => {
                    expect(res.name).to.eq(args.name);
                    expect(res.type).to.eq(args.type);
                    expect(res.contactEmail).to.eq(args.contactEmail);
                    expect(res).haveOwnProperty('apiId');
                    expect(res).haveOwnProperty('apiKey');
                    expect(res).haveOwnProperty('createdAt');
                    expect(res).haveOwnProperty('updatedAt');
                },
                (e) => {
                    throw e;
                }
            );
        });
    });

    describe('updateOrganization', () => {
        it('should update organization with timestamp', async () => {
            const organization = await factory.create('organization');
            const args = {
                id: organization.id,
                name: 'updateTestName',
                type: 'HQ',
                contactEmail: 'updatedemail@test.com'
            };

            return organizationRepo.updateOrganization(args).then(
                (res) => {
                    expect(res.updatedAt).to.not.eq(organization.updatedAt);
                    expect(res.name).to.eq(args.name);
                    expect(res.type).to.eq(args.type);
                    expect(res.contactEmail).to.eq(args.contactEmail);
                },
                (e) => {
                    throw e;
                }
            );
        });
    });

    describe('getOrganizationNames', () => {
        const ORG_NAMES = ['orgOne', 'orgTwo', 'orgThree'];

        beforeEach(async () => {
            await factory.create('organization', { shipperSeqNum: 1, name: ORG_NAMES[0] });
            await factory.create('organization', { shipperSeqNum: 2, name: ORG_NAMES[1] });
            await factory.create('organization', { shipperSeqNum: 3, name: ORG_NAMES[3] });
        });

        it('returns organization names given an organization scope', async () => {
            const res = await organizationRepo.getOrganizationNames([1]);
            expect(res.length).to.eq(1);
            expect(res[0]).to.eq(ORG_NAMES[0]);
        });

        it('returns organization names given an organization scope with multiple orgs', async () => {
            const res = await organizationRepo.getOrganizationNames([1, 2]);
            expect(res.length).to.eq(2);
            expect(res).to.include(ORG_NAMES[0]);
            expect(res).to.include(ORG_NAMES[1]);
        });

        it('returns nothing if no scope is given', async () => {
            const res = await organizationRepo.getOrganizationNames();
            expect(res.length).to.eq(0);
        });
    });

    describe('getOrganizationsByScope', () => {
        it('returns organization given an organization scope', async () => {
            const orgOne = await factory.create('organization', { shipperSeqNum: 1 });
            const res = await organizationRepo.getOrganizationsByScope({ ids: [1] });
            expect(res.length).to.eq(1);
            expect(res[0]._id.toString()).to.eq(orgOne._id.toString());
        });

        it('returns organization given an organization scope with multiple orgs', async () => {
            const orgOne = await factory.create('organization', { shipperSeqNum: 1 });
            const orgTwo = await factory.create('organization', { shipperSeqNum: 2 });
            const res = await organizationRepo.getOrganizationsByScope({ ids: [1, 2] });
            expect(res.length).to.eq(2);
            expect(res[0]._id.toString()).to.eq(orgOne._id.toString());
            expect(res[1]._id.toString()).to.eq(orgTwo._id.toString());
        });

        it('returns nothing if no scope is given', async () => {
            const res = await organizationRepo.getOrganizationsByScope({ ids: [] });
            expect(res.length).to.eq(0);
        });
    });

    describe('recordConsent', () => {
        it('sucessfully records consent for a given email and id', async () => {
            await factory.create('organization', { shipperSeqNum: 1, consent: null });
            const res = await organizationRepo.recordConsent({ id: 1, email: 'goodboy@greatjob.com' });
            expect(res.consent.email).to.eq('goodboy@greatjob.com');
            const fetchOrg = await organizationRepo.getOrganizationsByScope({ ids: [1] });
            expect(fetchOrg[0].consent.email).to.eq('goodboy@greatjob.com');
            expect(fetchOrg[0].consent.timestamp).not.be.null;
        });
    });
});
