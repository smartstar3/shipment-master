'use strict';
const sinon = require('sinon');
const vcr = require('vcr');

// initialize logger first
require('../../app/helpers/logger');
require('./chai');
require('./vcr');
const { setupDatabase, cleanDatabase } = require('./mongo');
const { setupServer, teardownServer } = require('./express');

require('given2/setup');

exports.mochaHooks = {
    beforeAll () {
        return (async () => {
            await setupDatabase();
        })();
    },

    beforeEach () {
        return (async () => {
            await setupServer();
            await cleanDatabase();

            vcr.beginRecording(this.currentTest);
        })();
    },

    afterEach () {
        return (async () => {
            await teardownServer();

            vcr.finishRecording(this.currentTest);
            sinon.restore();
        })();
    }
};
