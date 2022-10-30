const schema = require('../../../../../app/api/internal/graphql/admin').schema;
const { checkGraphQL, GOOD_RESPONSE, BAD_RESPONSE } = require('../../../../helper/graphql');
const { expect } = require('chai');

describe('GraphQL Shipment Test', () => {
    describe('Shipment Query Test', () => {
        describe('get shipment query test', () => {
            it('get all fields of shipment', () => {
                const response = checkGraphQL(`
                  query {
                    viewer {
                      shipment(trackingNum: "test") {
                        tn
                        status
                        date
                        vendor
                        toAddress {
                          name
                          address1
                          address2
                          city
                          state
                          zip
                          country
                          phone
                        }
                        fromAddress {
                          name
                          address1
                          address2
                          city
                          state
                          zip
                          country
                          phone
                        }
                        shipperName
                        label {
                          type
                          base64
                        }
                        tracking {
                          expectedDeliveryDate
                          events {
                            timestamp
                            status
                            message
                            location {
                              city
                              state
                              zip
                              lat
                              lng
                              timezone
                            }
                            expectedDeliveryDate
                          }
                          status
                        }
                        parcel {
                          description
                          length
                          width
                          height
                          weight
                          value
                          tracking_num
                        }
                      }
                    }
                  }
                `, schema);
                expect(response.message).to.equal(GOOD_RESPONSE);
            });

            it('should fail with invalid params', () => {
                const response = checkGraphQL(`
                  query {
                    viewer {
                      shipment(invalid: "test") {
                        tn
                        status
                        date
                      }
                    }
                  }
                `, schema);
                expect(response.message).to.equal(BAD_RESPONSE);
            });

            it('should fail with invalid fields', () => {
                const response = checkGraphQL(`
                  query {
                    viewer {
                      shipment {
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
