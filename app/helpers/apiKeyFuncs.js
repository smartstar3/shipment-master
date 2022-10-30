const uuid = require('uuid');

const generateApiId = () => {
    let rnd = uuid.v4();
    rnd = rnd.replace(/-/g, '');
    return rnd.substr(0, 4) + '-' + rnd.substr(4, 4) + '-' + rnd.substr(8, 5) + '-' + rnd.substr(13, 4);
};

const generateApiKey = (length = 21) => {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charLen = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charLen));
    }
    return result;
};

module.exports = {
    generateApiKey,
    generateApiId
};
