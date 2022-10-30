/* istanbul ignore file */
// Process ENV and other runtime variables into global config store
const path = require('path');

const dotenv = require('dotenv');

const { hasProp } = require('../helpers/utils');

const root = path.resolve(path.join(__dirname, '..', '..'));
const env = dotenv.config({ path: path.join(root, '.env') });
if (env.error) throw env.error;

// Prefer NODE_ENV outside of `.env` to allow it to be specified on command line.
if (process.env.NODE_ENV) {
    env.parsed.NODE_ENV = process.env.NODE_ENV;
}

// Test for our required `.env` fields and abort if missing
[
    'AXLEHIRE_AUTH_TOKEN',
    'AXLEHIRE_BASE_URL',
    'DHL_ECOMM_CLIENT_ID',
    'DHL_ECOMM_CLIENT_SECRET',
    'DHL_ECOMM_URL',
    'EDD',
    'EDD_TOBACCO',
    'GOOGLE_OAUTH_CALLBACK',
    'GOOGLE_OAUTH_CLIENT_ID',
    'GOOGLE_OAUTH_CLIENT_SECRET',
    'HTTPS_PORT',
    'HTTP_PORT',
    'INTERNAL_API_KEY',
    'JWT_REFRESH_TOKEN_SECRET',
    'JWT_SECRET',
    'LASERSHIP_API_ID',
    'LASERSHIP_API_KEY',
    'LASERSHIP_TEST_MODE',
    'LASERSHIP_URL',
    'LSO_API_URL',
    'LSO_PASSWORD',
    'LSO_USERNAME',
    'MONGO_URI',
    'NARVAR_API_TOKEN',
    'NARVAR_URL',
    'NODE_ENV',
    'ONTRAC_API_URL',
    'ONTRAC_LAX_ACCOUNT_NUMBER',
    'ONTRAC_LAX_PASSWORD',
    'ONTRAC_SLC_ACCOUNT_NUMBER',
    'ONTRAC_SLC_PASSWORD',
    'PARCELPREP_API_KEY',
    'PUBLIC_BUCKET',
    'PUBLIC_HOSTNAME',
    'SIGNATURE_S3_LOCATION',
    'SQS_URL_PREFIX',
    'UDS_CLIENT_ID',
    'UDS_CLIENT_KEY',
    'UDS_SOAP_URL'
]
    .forEach(name => {
        if (!hasProp(env.parsed, name)) {
            throw new Error(`Environment variable ${name} is missing`);
        }
    });

const gconfig = {
    nodeEnv: env.parsed.NODE_ENV,

    // Express
    httpPort: parseInt(env.parsed.HTTP_PORT, 10),
    httpsPort: parseInt(env.parsed.HTTPS_PORT, 10),

    trackingUrl: env.parsed.TRACKING_URL,

    // Auth
    jwtSecret: env.parsed.JWT_SECRET,
    jwtRefreshTokenSecret: env.parsed.JWT_REFRESH_TOKEN_SECRET,
    jwtRefreshTokenExpiration: parseInt(env.parsed.JWT_REFRESH_TOKEN_EXPIRATION),
    jwtExpiresSecs: parseInt(env.parsed.JWT_EXPIRES_SECS, 10) || (60 * 60), // one hour expiry

    providerAuthSecret: env.parsed.PROVIDER_AUTH_SECRET,
    internalApiKey: env.parsed.INTERNAL_API_KEY,

    // Application
    publicBucket: env.parsed.PUBLIC_BUCKET,

    forceTobaccoShipments: (env.parsed.FORCE_TOBACCO_SHIPMENTS || 'true') === 'true',

    edd: env.parsed.EDD,
    eddTobacco: env.parsed.EDD_TOBACCO,

    adminUI: {
        redirectURL: env.parsed.ADMIN_LOGIN_REDIRECT
    },

    consentWhitelistCutoff: env.parsed.CONSENT_WHITELIST_CUTOFF,

    // MongoDB
    mongoUri: env.parsed.NODE_ENV === 'test'
        ? env.parsed.TEST_MONGO_URI
        : env.parsed.MONGO_URI,

    // SQS
    sqsUrlPrefix: env.parsed.SQS_URL_PREFIX,

    // Software Vendors
    sendgridApiKey: env.parsed.SENDGRIDAPIKEY,

    google: {
        clientID: env.parsed.GOOGLE_OAUTH_CLIENT_ID,
        clientSecret: env.parsed.GOOGLE_OAUTH_CLIENT_SECRET,
        callbackURL: env.parsed.GOOGLE_OAUTH_CALLBACK
    },

    auth0: {
        domain: env.parsed.AUTH0_DOMAIN,
        audience: env.parsed.AUTH0_AUDIENCE,
        claimKeys: {
            orgKey: env.parsed.AUTH0_CLAIM_ORG_KEY,
            emailKey: env.parsed.AUTH0_CLAIM_EMAIL_KEY
        },
        client_id: env.parsed.AUTH0_CLIENT_ID,
        client_secret: env.parsed.AUTH0_CLIENT_SECRET,
        ci: {
            client_id: env.parsed.AUTH0_CI_CLIENT_ID,
            client_secret: env.parsed.AUTH0_CI_CLIENT_SECRET,
            password: env.parsed.AUTHO_CI_PASSWORD
        }

    },

    narvarUrl: env.parsed.NARVAR_URL,
    narvarApiToken: env.parsed.NARVAR_API_TOKEN,

    logzioToken: env.parsed.LOGZIO_SHIPPING_TOKEN,

    shippo: {
        credential: env.parsed.SHIPPO_CREDENTIAL || 'TESTCRED',
        requiredHeaders: (env.parsed.SHIPPO_REQUIRED_HEADERS || 'content-type,host,x-shippo-date').split(','),
        scope: env.parsed.SHIPPO_SCOPE || 'olx/shippo',
        secret: env.parsed.SHIPPO_SECRET || 'testSecret'
    },

    // Carrier APIs
    axlehireAuthToken: env.parsed.AXLEHIRE_AUTH_TOKEN,
    axlehireBaseUrl: env.parsed.AXLEHIRE_BASE_URL,

    conciseClientId: env.parsed.CONCISE_CLIENT_ID,
    conciseClientSecret: env.parsed.CONCISE_CLIENT_SECRET,
    conciseURL: env.parsed.CONCISE_URL,

    dhlecommerceURL: env.parsed.DHL_ECOMM_URL,
    dhlecommerceClientId: env.parsed.DHL_ECOMM_CLIENT_ID,
    dhlecommerceClientSecret: env.parsed.DHL_ECOMM_CLIENT_SECRET,

    lasershipApiId: env.parsed.LASERSHIP_API_ID,
    lasershipApiKey: env.parsed.LASERSHIP_API_KEY,
    lasershipUrl: env.parsed.LASERSHIP_URL,
    lasershipTestMode: env.parsed.LASERSHIP_TEST_MODE === '1',

    lsoPassword: env.parsed.LSO_PASSWORD,
    lsoUsername: env.parsed.LSO_USERNAME,
    lsoApiUrl: env.parsed.LSO_API_URL,

    onTrac: {
        credential: {
            SLC: {
                accountNumber: env.parsed.ONTRAC_SLC_ACCOUNT_NUMBER,
                password: env.parsed.ONTRAC_SLC_PASSWORD
            },
            LAX: {
                accountNumber: env.parsed.ONTRAC_LAX_ACCOUNT_NUMBER,
                password: env.parsed.ONTRAC_LAX_PASSWORD
            }
        },
        apiUrl: env.parsed.ONTRAC_API_URL
    },

    parcelPrepApiKey: env.parsed.PARCELPREP_API_KEY,

    udsClientId: env.parsed.UDS_CLIENT_ID,
    udsClientKey: env.parsed.UDS_CLIENT_KEY,
    udsSOAPUrl: env.parsed.UDS_SOAP_URL
};

const envConfig = {
    // NODE_ENV === 'production' vars
    production: {
        logLevel: env.parsed.LOG_LEVEL || 'info',
        useLogzio: true
    },
    // NODE_ENV === 'staging' vars
    staging: {
        logLevel: env.parsed.LOG_LEVEL || 'info',
        useLogzio: true
    },
    // NODE_ENV === 'development' vars
    development: {
        logLevel: env.parsed.LOG_LEVEL || 'debug',
        useLogzio: false
    },
    // NODE_ENV === 'test' vars
    test: {
        logLevel: env.parsed.LOG_LEVEL || 'debug',
        useLogzio: true
    },
    /**
     * NODE_ENV === 'local' vars
     *
     * Actually it is same with development.
     * But we can speed up the development with ignoring auth, ...etc.
     */
    local: {
        logLevel: env.parsed.LOG_LEVEL || 'debug',
        useLogzio: false
    }
};

// export blended config object
module.exports = Object.freeze(Object.assign(gconfig, envConfig[gconfig.nodeEnv]));
