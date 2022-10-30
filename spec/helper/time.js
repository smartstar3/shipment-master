const { DateTime } = require('luxon-business-days');

const getFutureDeliveryDate = (destinationTimezone = 'America/Chicago', days = 1, midnight = false) => {
    const today = getToday(destinationTimezone, midnight);

    const futureBusiness = today.setZone(destinationTimezone)
        .plusBusiness({ days: days })
        .startOf('day')
        .toISO();
    return futureBusiness;
};

const getPastDeliveryDate = (destinationTimezone = 'America/Chicago', days = 1, midnight = false) => {
    const today = getToday(destinationTimezone, midnight);

    const pastBusiness = today.setZone(destinationTimezone)
        .minusBusiness({ days: days })
        .startOf('day')
        .toISO();
    return pastBusiness;
};

const getToday = (timezone = 'UTC', midnight = false) => {
    return DateTime.now().setZone(timezone).set({
        hour: midnight ? 0 : 20,
        minute: 0,
        second: 0,
        millisecond: 0
    });
};

module.exports = {
    getFutureDeliveryDate,
    getPastDeliveryDate,
    getToday
};
