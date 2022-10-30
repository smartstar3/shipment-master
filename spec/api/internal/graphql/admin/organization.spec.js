const schema = require('../../../../../app/api/internal/graphql/admin').schema;
const { checkGraphQL, GOOD_RESPONSE, BAD_RESPONSE } = require('../../../../helper/graphql');
const { expect } = require('chai');

describe('GraphQL Organizations Test', () => {
    describe('Organizations Query Test', () => {
        describe('organizations query test', () => {
            it('get all fields of organization', () => {
                const response = checkGraphQL(`
            query {
              viewer {
                organizations {
                  id
                  name
                  type
                  shipperSeqNum
                  description
                  address
                  city
                  contactName
                  contactPhone
                  contactEmail
                  apiId
                  apiKey
                  createdAt
                  updatedAt
                }
              }
            }
          `, schema);
                expect(response.message).to.equal(GOOD_RESPONSE);
            });

            it('should fail with invalid field', () => {
                const response = checkGraphQL(`
            query {
              viewer {
                organizations(start: 0) {
                  invalidField
                }
              }
            }
          `, schema);
                expect(response.message).to.equal(BAD_RESPONSE);
            });
        });

        describe('organization query test', () => {
            it('get all fields of organization', () => {
                const response = checkGraphQL(`
            query {
              viewer {
                organization(id: "5f98be841ca00014c8d0c434") {
                  id
                  name
                  type
                  shipperSeqNum
                  description
                  address
                  city
                  contactName
                  contactPhone
                  contactEmail
                  createdAt
                  updatedAt
                }
              }
            }
         `, schema);
                expect(response.message).to.equal(GOOD_RESPONSE);
            });

            it('should fail with invalid field', () => {
                const response = checkGraphQL(`
            query {
              viewer {
                organization(id: "5f98be841ca00014c8d0c434") {
                  invalidField
                }
              }
            }
        `, schema);
                expect(response.message).to.equal(BAD_RESPONSE);
            });
        });
    });

    describe('Organizations Mutation Test', () => {
        describe('create organization mutation test', () => {
            it('create organization mutation validation', () => {
                const response = checkGraphQL(`
            mutation {
              createOrganization(
                name: "FashionNova"
                type: "Shipper"
                description: ""
                address: "2801 E. 46th St."
                city: "Vernon"
                contactName: ""
                contactPhone: ""
                contactEmail: "test@user.com"
              ) {
                name
                type
                description
                shipperSeqNum
                address
                city
                contactName
                contactPhone
                contactEmail
              }
            }
          `, schema);
                expect(response.message).to.equal(GOOD_RESPONSE);
            });

            it('should fail with missing params', () => {
                const response = checkGraphQL(`
            mutation {
              createOrganization(
                description: ""
                address: "2801 E. 46th St."
                city: "Vernon"
                contactName: ""
                contactPhone: ""
              ) {
                name
                type
                description
                address
                city
                contactName
                contactPhone
                contactEmail
                createdAt
                updatedAt
              }
            }
          `, schema);
                expect(response.message).to.equal(BAD_RESPONSE);
            });

            it('should fail with invalid fields', () => {
                const response = checkGraphQL(`
            mutation {
              createOrganization(
                name: "FashionNova"
                type: "Shipper"
                description: ""
                address: "2801 E. 46th St."
                city: "Vernon"
                contactName: ""
                contactPhone: ""
                contactEmail: "test@user.com"
              ) {
                organizationName
              }
            }
          `, schema);
                expect(response.message).to.equal(BAD_RESPONSE);
            });
        });

        describe('update organization mutation test', () => {
            it('update organization mutation valid', () => {
                const response = checkGraphQL(`
            mutation {
              updateOrganization(
                id: "5f4068b84b14986b69780d79",
                name: "FashionNova"
                type: "Shipper"
                description: ""
                address: "2801 E. 46th St."
                city: "Vernon"
                contactName: ""
                contactPhone: ""
                contactEmail: "test@user.com"
              ) {
                name
                type
                shipperSeqNum
                description
                address
                city
                contactName
                contactPhone
                contactEmail
                createdAt
                updatedAt
              }
            }
          `, schema);
                expect(response.message).to.equal(GOOD_RESPONSE);
            });

            it('should fail with missing argument', () => {
                const response = checkGraphQL(`
            mutation {
              updateOrganization(
                description: ""
                address: "2801 E. 46th St."
                city: "Vernon"
                contactName: ""
                contactPhone: ""
              ) {
                name
                type
                description
                address
                city
                contactName
                contactPhone
                contactEmail
                createdAt
                updatedAt
              }
            }
          `, schema);
                expect(response.message).to.equal(BAD_RESPONSE);
            });

            it('should fail with invalid fields', () => {
                const response = checkGraphQL(`
            mutation {
              updateOrganization(
                id: "5f4068b84b14986b69780d79",
                name: "FashionNova"
                type: "Shipper"
                description: ""
                address: "2801 E. 46th St."
                city: "Vernon"
                contactName: ""
                contactPhone: ""
                contactEmail: "test@user.com"
              ) {
                invalidField
              }
            }
          `, schema);
                expect(response.message).to.equal(BAD_RESPONSE);
            });
        });

        describe('delete organization mutation test', () => {
            it('delete mutation valid', () => {
                const response = checkGraphQL(`
            mutation {
              deleteOrganization(id: "5f4068b84b14986b69780d79")
            }
          `, schema);
                expect(response.message).to.equal(GOOD_RESPONSE);
            });

            it('should fail with missing arguments', () => {
                const response = checkGraphQL(`
            mutation {
              deleteOrganization
            }
          `, schema);
                expect(response.message).to.equal(BAD_RESPONSE);
            });
        });

        describe('update api key mutation test', () => {
            it('update apiKey mutation test', () => {
                const response = checkGraphQL(`
            mutation {
              updateApiKey(id: "5f4068b84b14986b69780d79")
            }
          `, schema);
                expect(response.message).to.equal(GOOD_RESPONSE);
            });

            it('should fail with missing arguments', () => {
                const response = checkGraphQL(`
            mutation {
              updateApiKey
            }
          `, schema);
                expect(response.message).to.equal(BAD_RESPONSE);
            });
        });
    });
});
