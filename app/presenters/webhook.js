const present = (webhook) => {
    return {
        id: webhook._id.toString(),
        createdAt: webhook.createdAt.toISOString(),
        updatedAt: webhook.updatedAt?.toISOString() || null,
        url: webhook.url
    };
};

module.exports = {
    present
};
