// api/internal/graphql/types/users.js -- manage all users types, adding them onto the top "viewer" object in the root query
//
'use strict';
const userController = require('../../../../../controllers/graphql/user');

const typeDefs = `

""" 
Individual User record containing user details
"""

type User {
    emailVerified :String
    email: String
    familyName : String
    givenName : String
    name : String
    nickname : String
    id : String
    loginsCount : Int
    lastLogin : String
    shipperSeqNum : Int
    organization : Organization
}


type Mutation {
  createUser(email:String!, shipperSeqNum: Int!, firstName: String, lastName: String): User
}    

extend type Viewrec {
    "fetch by start, count"
    users: [User]
}

`;

// resolvers call into the repository layer
//
const resolvers = {
    Viewrec: {
        users: userController.getUsers
    },
    Mutation: {
        createUser: userController.createUser
    }
};

module.exports = { typeDefs, resolvers };
