// api/internal/graphql/admin.js -- load all graphql schema and resolvers onto express router
//
'use strict';
const express = require('express');
const graphqlTools = require('graphql-tools');
const { graphqlHTTP } = require('express-graphql');

// load sub-types for all required GQL types and resolvers
//
const typeOrganizations = require('./types/admin/organizations');
const typeServices = require('./types/admin/services');
const typeShipments = require('./types/admin/shipments');
const typeUsers = require('./types/admin/users');
const typeZipZones = require('./types/admin/zipZones');

const typeDefs = [
    `
""" 
root query
"""
type Query {
    viewer: Viewrec
}

"""
Top-level Viewer context container, extended by sub-type
"""
type Viewrec {
    ID: String
}
`];

const resolvers = [{
    Query: {
        viewer: () => ({})
    },
    Viewrec: {
        ID: () => '100' // <- stub
    }
}];

// add in our sub-types and resolvers
//
typeDefs.push(typeUsers.typeDefs);
resolvers.push(typeUsers.resolvers);

typeDefs.push(typeOrganizations.typeDefs);
resolvers.push(typeOrganizations.resolvers);

typeDefs.push(typeServices.typeDefs);
resolvers.push(typeServices.resolvers);

typeDefs.push(typeShipments.typeDefs);
resolvers.push(typeShipments.resolvers);

typeDefs.push(typeZipZones.typeDefs);
resolvers.push(typeZipZones.resolvers);

// build GQL Schema Object
//
const schema = graphqlTools.makeExecutableSchema({ typeDefs, resolvers });

// create express router for GQL
//
module.exports = {
    adminGraphql: () => {
        const gqlRouter = express.Router(); // new container for graphql service endpoint
        gqlRouter.use(graphqlHTTP({ schema, graphiql: true }));
        return gqlRouter;
    },
    schema
};
