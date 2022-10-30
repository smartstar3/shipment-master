const schema = require('../../../../../app/api/internal/graphql/admin').schema;
const { checkGraphQL, GOOD_RESPONSE, BAD_RESPONSE } = require('../../../../helper/graphql');
const { expect } = require('chai');

describe('GraphQL Service Test', () => {
    describe('Service Query Test', () => {
        describe('get services query test', () => {
            it('get all fields of service', () => {
                const response = checkGraphQL(`
        query {
          viewer {
            services {
              id
              name
              statuses {
                status
                responseMs
                bytesTx
                bytesRx
                url
                created_at
              }
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
            services {
              invalidKey
            }
          }
        }
      `, schema);
                expect(response.message).to.equal(BAD_RESPONSE);
            });
        });
    });
});
