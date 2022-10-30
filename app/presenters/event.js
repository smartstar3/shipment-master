const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

const { publicBucket } = require('../config');
const { STATUSES: { DELIVERED } } = require('../constants/trackingConstants');

const getPresignedUrl = async (url) => {
    const client = new S3Client();
    const command = new GetObjectCommand({
        Bucket: publicBucket,
        Key: new URL(url).pathname.replace(/^\//, '')
    });

    return getSignedUrl(client, command, { expiresIn: 3600 });
};

const present = async ({
    timestamp,
    externalStatus,
    message,
    location,
    expectedDeliveryDate = null,
    signature = null,
    signatureUrl = null
}) => {
    if (externalStatus !== DELIVERED) {
        signature = null;
        signatureUrl = null;
    } else if (signatureUrl) {
        signatureUrl = await getPresignedUrl(signatureUrl);
    }

    return {
        timestamp,
        status: externalStatus,
        message,
        location: {
            city: location?.city || null,
            state: location?.state || null,
            zip: location?.zip || null,
            lat: location?.lat || null,
            lng: location?.lng || null,
            timezone: location?.timezone || null
        },
        expectedDeliveryDate,
        signature,
        signatureUrl
    };
};

module.exports = {
    present
};
