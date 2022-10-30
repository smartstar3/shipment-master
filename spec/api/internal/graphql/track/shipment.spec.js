const schema = require('../../../../../app/api/internal/graphql/track').schema;
const { checkGraphQL, GOOD_RESPONSE, BAD_RESPONSE } = require('../../../../helper/graphql');
const { expect } = require('chai');

describe('GraphQL Shipment Test', () => {
    describe('Shipment Query Test', () => {
        describe('get shipment query test', () => {
            it('get all fields of shipment', () => {
                const response = checkGraphQL(`
            query {
              viewer {
                shipment(trackingNum: "XLX000000C800000D") {
                  tn
                  status
                  date
                  tracking {
                    expectedDeliveryDate
                    status
                    events {
                      timestamp
                      status
                      message
                      location {
                        city
                        state
                        zip
                      }
                      expectedDeliveryDate
                    }
                  }
                  toAddress {
                    city
                    state
                  }
                  fromAddress {
                    city
                    state
                  }
                }
              }
            }
          `, schema);
                expect(response.message).to.equal(GOOD_RESPONSE);
            });

            it('should fail with invalid fields', () => {
                const response = checkGraphQL(`
            query {
              viewer {
                invalidKey
              }
            }
          `, schema);
                expect(response.message).to.equal(BAD_RESPONSE);
            });
        });
    });
});
