// api/internal/graphql/admin.js -- load all graphql schema and resolvers onto express router
//
'use strict';
const express = require('express');
const graphqlTools = require('graphql-tools');
const { graphqlHTTP } = require('express-graphql');

// load sub-types for all required GQL types and resolvers
//
const typeOrgs = require('./types/nexus/organizations');
const typeShipments = require('./types/nexus/shipments');
const { auth0: { claimKeys: { orgKey, emailKey } } } = require('../../../config');
const { getProp } = require('../../../helpers/utils');

const typeDefs = [
    `
""" 
root query
"""
type AuthUser { 
    organizationId: Int
    email : String
}

type Query {
    user: AuthUser
}

type Mutation

`];

const resolvers = [{
    Query: {
        user: (_, __, context) => ({
            organizationId: getProp(context, orgKey),
            email: getProp(context, emailKey)
        })
    }
}];

// add in our sub-types and resolvers
//
typeDefs.push(typeShipments.typeDefs);
typeDefs.push(typeOrgs.typeDefs);

resolvers.push(typeShipments.resolvers);
resolvers.push(typeOrgs.resolvers);

// build GQL Schema Object
//

const schema = graphqlTools.makeExecutableSchema({ typeDefs, resolvers });

// create express router for GQL
//
module.exports = {
    nexusGraphql: () => {
        const gqlRouter = express.Router(); // new container for graphql service endpoint
        gqlRouter.use(graphqlHTTP({ schema, graphiql: true }));
        return gqlRouter;
    },
    schema
};
