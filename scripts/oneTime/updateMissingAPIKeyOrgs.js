// scripts/oneTime/updateMissingAPIKeyOrgs.js
// -- add apiId and apiKey to organization which doesn't have them.
//

'use strict';
// initialize logger first
const { getModuleContext, initialize } = require('@onelive-dev/x-logger');

const logger = initialize({ context: getModuleContext(module) });

const apiKeyFunc = require('../../app/helpers/apiKeyFuncs');
const mongo = require('../../app/helpers/mongo');
const Organizations = require('../../app/models/organizations');

logger.info('updateMissingAPIKeyOrgs start');

const updateMissingAPIKeyOrgs = async () => {
    const orgs = await Organizations.dbgets({
        $or: [
            { apiKey: { $exists: false } },
            { apiId: { $exists: false } }
        ]
    });

    for (const org of orgs) {
        const apiId = apiKeyFunc.generateApiId();
        const apiKey = apiKeyFunc.generateApiKey();

        await Organizations.dbupdate({ id: org._id, apiId, apiKey });
    }
};

const main = async () => {
    await mongo.connect();
    await updateMissingAPIKeyOrgs();
    process.exit(0);
};

main();
