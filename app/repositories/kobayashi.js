const {
    Kobayashi,
    SourcesMongoGateway,
    RowsMongoGateway
} = require('kobayashi');
const { getLogger } = require('@onelive-dev/x-logger');

const mongo = require('../helpers/mongo');

const logger = getLogger(module);

let client;

const getGateways = () => {
    return {
        sources: new SourcesMongoGateway({ client: mongo.get() }),
        rows: new RowsMongoGateway({ client: mongo.get() })
    };
};

function getClient () {
    if (!client) {
        // TODO: `require` here is to avoid circular dependency.
        //
        // ✖ Found 1 circular dependency!
        //
        // 1) app/repositories/kobayashi.js > app/repositories/scv/index.js > app/repositories/scv/runners.js
        client = new Kobayashi(getGateways(), require('./scv').get(), logger);
    }

    return client;
}

module.exports = {
    getClient,
    getGateways
};
