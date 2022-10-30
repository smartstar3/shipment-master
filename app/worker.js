// initialize logger first
const { getModuleContext, initialize } = require('@onelive-dev/x-logger');

const logger = initialize({ context: getModuleContext(module) });

const Sentry = require('@sentry/node');
const { ArgumentParser } = require('argparse');

const mongo = require('./helpers/mongo');
const scv = require('./repositories/scv');

process.on('SIGINT', () => {
    logger.warn('caught SIGINT');
    scv.get().stopWorking();
});

function main (args) {
    return new Promise((resolve, reject) => {
        Sentry.init({ dsn: process.env.SENTRY_DSN });

        mongo.connect()
            .then(() => {
                scv.get().work([args.type])
                    .then(() => resolve(0))
                    .catch((err) => {
                        logger.error('scv error', err);
                        Sentry.captureException(err);
                        reject(err);
                    });
            })
            .catch((err) => {
                logger.error('connect error', err);
                Sentry.captureException(err);
                reject(err);
            });
    });
};

const parser = new ArgumentParser({ description: 'Run kobayashi a worker' });
parser.add_argument('-t', '--type', {
    required: true,
    help: 'The type of worker to run, defaults to all types.'
});

main(parser.parse_args())
    .then((res) => process.exit(res))
    .catch((err) => {
        logger.error('worker error', err);
        process.exit(1);
    });
