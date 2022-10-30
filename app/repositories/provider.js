const crypto = require('crypto');
const Provider = require('../models/provider');
const { providerAuthSecret } = require('../config/index');

const initilizationVector = crypto.randomBytes(16);

const encrypt = (value, secret = providerAuthSecret) => {
    const cipher = crypto.createCipheriv('aes-256-ctr', secret, initilizationVector);
    const encrypted = Buffer.concat([cipher.update(value), cipher.final()]);
    return {
        initilizationVector: initilizationVector.toString('hex'),
        value: encrypted.toString('hex')
    };
};

const decrypt = ({ value, initilizationVector }) => {
    const decipher = crypto.createDecipheriv('aes-256-ctr', providerAuthSecret, Buffer.from(initilizationVector, 'hex'));
    const decrpyted = Buffer.concat([decipher.update(Buffer.from(value, 'hex')), decipher.final()]);
    return decrpyted.toString();
};

const getCredentials = async (provider) => {
    const record = await Provider.dbget({ name: provider });
    if (!record) return { name: provider, credentials: {} }; // opaque return
    else {
        const decryptedCredentials = decryptCredentials(record.credentials);
        return { ...record, credentials: decryptedCredentials };
    }
};

const encryptCredentials = async (credentials, secret = providerAuthSecret) => {
    const hashPairs = Object.entries(credentials);
    const hashedCredentials = [];
    for (const [name, value] of hashPairs) {
        const key = await encrypt(name + '', secret);
        const encryptedValue = await encrypt(value + '', secret);
        hashedCredentials.push([key, encryptedValue]);
    }
    return hashedCredentials;
};

const decryptCredentials = (credentials) => {
    return Object.fromEntries(
        credentials.map(([name, value]) => [decrypt(name), decrypt(value)])
    );
};

const setCredentials = async (provider, credentials) => {
    const hashedCredentials = await encryptCredentials(credentials);
    return await Provider.dbset({ name: provider, credentials: hashedCredentials });
};

const updateCredentials = async (provider, newCredentials, replace = false, secret = providerAuthSecret) => {
    let updateCredentials;
    const existing = await getCredentials(provider);
    if (!replace) {
        updateCredentials = await encryptCredentials({ ...existing.credentials, ...newCredentials }, secret);
    } else {
        updateCredentials = await encryptCredentials(newCredentials, secret);
    }
    await Provider.dbupdate({ ...existing, credentials: updateCredentials });
};

// For use only when we rotate the secret.
const rotateSecret = async (newSecret) => {
    const docs = await Provider.dbgets({});
    for (const doc of docs) {
        const creds = decryptCredentials(doc.credentials);
        await updateCredentials(doc.name, creds, true, newSecret);
    }
};

module.exports = {
    setCredentials,
    getCredentials,
    rotateSecret,
    updateCredentials
};
