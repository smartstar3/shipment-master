// api/internal/graphql/track.js -- load all of track grapqhl schema and resolvers onto express router
//
'use strict';
const express = require('express');
const graphqlTools = require('graphql-tools');
const { graphqlHTTP } = require('express-graphql');

// load sub-types for all required GQL types and resolvers
//
const typeTrackers = require('./types/track/shipments');

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
typeDefs.push(typeTrackers.typeDefs);
resolvers.push(typeTrackers.resolvers);

// build GQL Schema Object
//
const schema = graphqlTools.makeExecutableSchema({ typeDefs, resolvers });

// create express router for GQL
module.exports = {
    trackGraphql: () => {
        const gqlRouter = express.Router(); // new container for graphql service endpoint
        gqlRouter.use(graphqlHTTP({ schema, graphiql: false }));
        return gqlRouter;
    },
    schema
};
