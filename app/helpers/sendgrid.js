const ejs = require('ejs');
const path = require('path');
const sendgrid = require('@sendgrid/mail');

const { getLogger } = require('@onelive-dev/x-logger');

const gconfig = require('../config');

const logger = getLogger(module);

sendgrid.setApiKey(gconfig.sendgridApiKey);

const sendNotificationEmail = data => new Promise((resolve, reject) => {
    const log = logger.child({ method: 'sendNotificationEmail' });

    const msg = {
        to: data.to,
        from: {
            email: 'no-reply@onelive.com',
            name: 'OneLiveX'
        },
        subject: data.subject,
        text: data.title
    };

    return ejs
        .renderFile(path.join(__dirname, './reset-email.ejs'), {
            confirm_link: data.confirmUrl
        })
        .then((result) => {
            msg.html = result;
            return sendgrid.send(msg)
                .then(() => {
                    resolve({ status: true });
                })
                .catch((err) => {
                    reject(err);
                });
        })
        .catch((err) => {
            log.error('sendNotificationEmail error', err);
            throw err;
        });
});

module.exports = {
    sendNotificationEmail
};
