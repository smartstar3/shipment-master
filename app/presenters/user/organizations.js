module.exports = {
    present: (organization) => {
        return {
            id: organization._id,
            name: organization.name,
            type: organization.type,
            description: organization.description,
            address: organization.address,
            contactName: organization.contactName,
            contactPhone: organization.contactPhone,
            contactEmail: organization.contactEmail,
            apiId: organization.apiId,
            apiKey: organization.apiKey
        };
    }
};
