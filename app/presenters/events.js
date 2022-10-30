const { DateTime } = require('luxon-business-days');

const eventPresenter = require('./event');
const {
    STATUSES: { OUT_FOR_DELIVERY, DELIVERED, LABEL_CREATED, RETURN_TO_SENDER },
    statusHierarchy
} = require('../constants/trackingConstants');

const EDD_TODAY_STATUSES = [RETURN_TO_SENDER, DELIVERED, OUT_FOR_DELIVERY];

const getTodayISO = (destinationTimezone = 'America/Chicago') => {
    return DateTime
        .now()
        .setZone(destinationTimezone)
        .set({ hour: 20, minute: 0, second: 0, millisecond: 0 })
        .toISO();
};

const addWeekdaysISO = (isoDate, numDays, destinationTimezone = 'America/Chicago') => {
    const futureDate = DateTime
        .fromISO(isoDate, { zone: destinationTimezone, setZone: true })
        .plusBusiness({ days: numDays });
    return futureDate.setZone(destinationTimezone).startOf('day').toISO();
};

// if the date has passed it will return today + 1 biz
// otherwise it returns the date unmodified
const adjustDateIfPast = (isoDate, destinationTimezone = 'America/Chicago') => {
    if (isoDate < getTodayISO()) {
        return addWeekdaysISO(getTodayISO(destinationTimezone), 1, destinationTimezone);
    } else {
        return isoDate;
    }
};

const sortAndFilterEvents = (events) => {
    events = events.sort((event, other) => {
        const timeDifference = new Date(event.timestamp) - new Date(other.timestamp);

        return timeDifference === 0
            ? statusHierarchy[event.externalStatus] - statusHierarchy[other.externalStatus]
            : timeDifference;
    });

    const createdEvent = events.find((event) => (!event.hidden && event.externalStatus === LABEL_CREATED));

    if (!createdEvent) return [];

    const firstTerminalTransitEvent = events.find(({ terminal, hidden, externalStatus }) => {
        return terminal && !hidden && externalStatus !== LABEL_CREATED;
    });

    return events.filter(({ hidden, timestamp, terminal }) => {
        if (hidden || timestamp < createdEvent.timestamp) {
            return false;
        } else {
            return (terminal || !firstTerminalTransitEvent) ? true : (timestamp < firstTerminalTransitEvent.timestamp);
        }
    });
};

const getExpectedDelivery = (
    events,
    destinationTimezone = 'America/Chicago'
) => {
    let adjustedEDD; // estimate from logic
    const { externalStatus: finalStatus } = events[events.length - 1];

    if (EDD_TODAY_STATUSES.includes(finalStatus)) {
        return getTodayISO(destinationTimezone);
    } else {
        const hasTerminalEvent = events.some(event => event.terminal && !event.hidden && event.externalStatus !== LABEL_CREATED);
        if (!hasTerminalEvent) {
            // we only have a label created event, therefore it's not with the final mile carrier
            adjustedEDD = addWeekdaysISO(getTodayISO(destinationTimezone), 3, destinationTimezone);
        } else {
            // if we have a final mile scan set it to today + 1
            adjustedEDD = addWeekdaysISO(getTodayISO(destinationTimezone), 1, destinationTimezone);
        }
        return adjustDateIfPast(adjustedEDD, destinationTimezone);
    }
};

module.exports = {
    present: async (events = [], opts = {}) => {
        const {
            destinationTimezone = 'America/Chicago'
        } = opts;

        events = sortAndFilterEvents(events);

        if (events.length === 0) {
            return { status: 'Unknown', events: [] };
        }

        const finalStatus = events[events.length - 1].externalStatus;
        const edd = getExpectedDelivery(events, destinationTimezone);
        return {
            expectedDeliveryDate: edd,
            status: finalStatus,
            events: await Promise.all(events.map(event => eventPresenter.present(event)))
        };
    }
};
