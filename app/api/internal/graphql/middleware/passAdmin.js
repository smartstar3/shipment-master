const { getLogger } = require('@onelive-dev/x-logger');

const gconfig = require('../../../../config');
const Roles = require('../../../../models/roles');

const logger = getLogger(module);

module.exports = async (req, res, next) => {
    logger.debug('entering passAdmin', { user: req.user });

    const isAdmin = await Roles.isAdmin(req.user.roleId);

    if (req.user && (gconfig.nodeEnv === 'local' || isAdmin)) {
        logger.debug('admin auth ok');
        next();
    } else {
        logger.debug('invalid admin auth');
        res.sendStatus(401);
    }
};
