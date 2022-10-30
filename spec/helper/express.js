const express = require('express');

const apiRouter = require('../../app/api');
const gconfig = require('../../app/config');

module.exports = {
    setupServer: async () => {
        const app = express();

        app.use(apiRouter);

        global.server = app.listen(gconfig.httpPort, 'localhost');
    },

    teardownServer: async () => {
        global.server.close();
    }
};
