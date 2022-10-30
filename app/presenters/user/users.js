const organizationPresenter = require('./organizations');

module.exports = {
    present: (user) => {
        return {
            id: user._id,
            firstname: user.firstname,
            lastname: user.lastname,
            email: user.email,
            roleId: user.roleId,
            organization: organizationPresenter.present(user.organizations[0])
        };
    }
};
