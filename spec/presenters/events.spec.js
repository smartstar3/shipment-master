const { DateTime } = require('luxon-business-days');
const { expect, factory } = require('chai');

const { getFutureDeliveryDate, getToday, getPastDeliveryDate } = require('../helper/time');
const { present } = require('../../app/presenters/events');

describe('Events Presenter', () => {
    describe('present', () => {
        it('presents Unknown when no events', async () => {
            expect(await present([])).to.eql({ status: 'Unknown', events: [] });
        });

        it('presents the most recent status and events in order of time', async () => {
            const destinationTimezone = 'UTC';
            const {
                today,
                plusFour,
                plusOne,
                yesterday
            } = await factory.create('expectedDeliveryDates', {
                timezone: 'UTC',
                destinationTimezone
            });
            const events = [
                {
                    timestamp: plusFour,
                    externalStatus: 'Out for Delivery',
                    message: 'OUT FOR DELIVERY',
                    location: { city: 'Austin', state: 'TX' },
                    expectedDeliveryDate: null
                },
                {
                    timestamp: today,
                    externalStatus: 'In-Transit',
                    message: 'In Transit',
                    location: { city: 'Austin', state: 'TX' },
                    expectedDeliveryDate: null
                },
                {
                    timestamp: plusOne,
                    externalStatus: 'In-Transit',
                    message: 'In Transit',
                    location: { city: 'Austin', state: 'TX' },
                    expectedDeliveryDate: null
                },
                {
                    timestamp: yesterday,
                    externalStatus: 'Label Created',
                    message: 'Label Created',
                    location: { city: 'Austin', state: 'TX' },
                    expectedDeliveryDate: null
                }
            ];

            const presented = await present(events, {
                deliveryDays: 4,
                destinationTimezone
            });

            expect(presented).to.eql({
                status: 'Out for Delivery',
                expectedDeliveryDate: today,
                events: [
                    {
                        timestamp: yesterday,
                        status: 'Label Created',
                        message: 'Label Created',
                        location: {
                            city: 'Austin',
                            state: 'TX',
                            zip: null,
                            lat: null,
                            lng: null,
                            timezone: null
                        },
                        expectedDeliveryDate: null,
                        signature: null,
                        signatureUrl: null
                    },
                    {
                        timestamp: today,
                        status: 'In-Transit',
                        message: 'In Transit',
                        location: {
                            city: 'Austin',
                            state: 'TX',
                            zip: null,
                            lat: null,
                            lng: null,
                            timezone: null
                        },
                        expectedDeliveryDate: null,
                        signature: null,
                        signatureUrl: null
                    },
                    {
                        timestamp: plusOne,
                        status: 'In-Transit',
                        message: 'In Transit',
                        location: {
                            city: 'Austin',
                            state: 'TX',
                            zip: null,
                            lat: null,
                            lng: null,
                            timezone: null
                        },
                        expectedDeliveryDate: null,
                        signature: null,
                        signatureUrl: null
                    },
                    {
                        timestamp: plusFour,
                        status: 'Out for Delivery',
                        message: 'OUT FOR DELIVERY',
                        location: {
                            city: 'Austin',
                            state: 'TX',
                            zip: null,
                            lat: null,
                            lng: null,
                            timezone: null
                        },
                        expectedDeliveryDate: null,
                        signature: null,
                        signatureUrl: null
                    }
                ]
            });
        });

        it('sorts statuses by hierarchy', async () => {
            const destinationTimezone = 'UTC';
            const { today, yesterday } = await factory.create('expectedDeliveryDates', {
                timezone: 'UTC',
                destinationTimezone
            });
            const events = [
                {
                    timestamp: today,
                    externalStatus: 'Delivered',
                    message: 'DELIVERED',
                    location: { city: 'Austin', state: 'TX' },
                    expectedDeliveryDate: null
                },
                {
                    timestamp: today,
                    externalStatus: 'Out for Delivery',
                    message: 'OUT FOR DELIVERY',
                    location: { city: 'Austin', state: 'TX' },
                    expectedDeliveryDate: null
                },
                {
                    timestamp: yesterday,
                    externalStatus: 'Label Created',
                    message: 'Label Created',
                    location: { city: 'Austin', state: 'TX' },
                    expectedDeliveryDate: null
                }
            ];

            const presented = await present(events, {
                deliveryDays: 4,
                destinationTimezone
            });

            expect(presented).to.eql({
                status: 'Delivered',
                expectedDeliveryDate: today,
                events: [
                    {
                        timestamp: yesterday,
                        status: 'Label Created',
                        message: 'Label Created',
                        location: {
                            city: 'Austin',
                            state: 'TX',
                            zip: null,
                            lat: null,
                            lng: null,
                            timezone: null
                        },
                        expectedDeliveryDate: null,
                        signature: null,
                        signatureUrl: null
                    },
                    {
                        timestamp: today,
                        status: 'Out for Delivery',
                        message: 'OUT FOR DELIVERY',
                        location: {
                            city: 'Austin',
                            state: 'TX',
                            zip: null,
                            lat: null,
                            lng: null,
                            timezone: null
                        },
                        expectedDeliveryDate: null,
                        signature: null,
                        signatureUrl: null
                    },
                    {
                        timestamp: today,
                        status: 'Delivered',
                        message: 'DELIVERED',
                        location: {
                            city: 'Austin',
                            state: 'TX',
                            zip: null,
                            lat: null,
                            lng: null,
                            timezone: null
                        },
                        expectedDeliveryDate: null,
                        signature: null,
                        signatureUrl: null
                    }
                ]
            });
        });

        it('trims trucking events if they occur after the first final mile scan', async () => {
            const destinationTimezone = 'UTC';

            const today = getToday(destinationTimezone);
            const tomorrow = getFutureDeliveryDate(destinationTimezone, 1);
            const day2 = getFutureDeliveryDate(destinationTimezone, 2);
            const day3 = getFutureDeliveryDate(destinationTimezone, 3);
            const day4 = getFutureDeliveryDate(destinationTimezone, 4);

            const events = [
                {
                    timestamp: day4,
                    externalStatus: 'In-Transit',
                    message: 'In Transit',
                    location: { city: 'Austin', state: 'TX' },
                    expectedDeliveryDate: null
                },
                {
                    timestamp: day4,
                    externalStatus: 'Out for Delivery',
                    message: 'OUT FOR DELIVERY',
                    location: { city: 'Austin', state: 'TX' },
                    expectedDeliveryDate: null,
                    terminal: true
                },
                {
                    timestamp: day3,
                    externalStatus: 'In-Transit',
                    message: 'In Transit',
                    location: { city: 'Austin', state: 'TX' },
                    expectedDeliveryDate: null,
                    terminal: true
                },
                {
                    timestamp: day2,
                    externalStatus: 'In-Transit',
                    message: 'In Transit',
                    location: { city: 'Austin', state: 'TX' },
                    expectedDeliveryDate: null
                },
                {
                    timestamp: tomorrow,
                    externalStatus: 'In-Transit',
                    message: 'In Transit',
                    location: { city: 'Austin', state: 'TX' },
                    expectedDeliveryDate: null,
                    terminal: true
                },
                {
                    timestamp: today.toISO(),
                    externalStatus: 'Label Created',
                    message: 'Label Created',
                    location: { city: 'Austin', state: 'TX' },
                    expectedDeliveryDate: null,
                    terminal: true
                }
            ];

            const presented = await present(events, {
                deliveryDays: 4,
                destinationTimezone
            });

            expect(presented).to.eql({
                status: 'Out for Delivery',
                expectedDeliveryDate: today.toISO(),
                events: [
                    {
                        timestamp: today.toISO(),
                        status: 'Label Created',
                        message: 'Label Created',
                        location: {
                            city: 'Austin',
                            state: 'TX',
                            zip: null,
                            lat: null,
                            lng: null,
                            timezone: null
                        },
                        expectedDeliveryDate: null,
                        signature: null,
                        signatureUrl: null
                    },
                    {
                        timestamp: tomorrow,
                        status: 'In-Transit',
                        message: 'In Transit',
                        location: {
                            city: 'Austin',
                            state: 'TX',
                            zip: null,
                            lat: null,
                            lng: null,
                            timezone: null
                        },
                        expectedDeliveryDate: null,
                        signature: null,
                        signatureUrl: null
                    },
                    {
                        timestamp: day3,
                        status: 'In-Transit',
                        message: 'In Transit',
                        location: {
                            city: 'Austin',
                            state: 'TX',
                            zip: null,
                            lat: null,
                            lng: null,
                            timezone: null
                        },
                        expectedDeliveryDate: null,
                        signature: null,
                        signatureUrl: null
                    },
                    {
                        timestamp: day4,
                        status: 'Out for Delivery',
                        message: 'OUT FOR DELIVERY',
                        location: {
                            city: 'Austin',
                            state: 'TX',
                            zip: null,
                            lat: null,
                            lng: null,
                            timezone: null
                        },
                        expectedDeliveryDate: null,
                        signature: null,
                        signatureUrl: null
                    }
                ]
            });
        });

        it('EDD = today + 1  if no delivery or delivered events exist but a final mile scan has occured', async () => {
            const destinationTimezone = 'UTC';
            const yesterday = getPastDeliveryDate(destinationTimezone, 1);
            const today = getToday(destinationTimezone, true);
            const tomorrow = getFutureDeliveryDate(destinationTimezone, 1, true);

            const events = [
                {
                    timestamp: yesterday,
                    externalStatus: 'Label Created',
                    message: 'Label Created',
                    location: { city: 'Austin', state: 'TX' },
                    expectedDeliveryDate: null,
                    terminal: true
                },
                {
                    timestamp: today.toISO(),
                    externalStatus: 'In-Transit',
                    message: 'In-Transit',
                    location: { city: 'Austin', state: 'TX' },
                    expectedDeliveryDate: null,
                    terminal: true
                },
                {
                    timestamp: today.toISO(),
                    externalStatus: 'In-Transit',
                    message: 'In Transit',
                    location: { city: 'Austin', state: 'TX' },
                    expectedDeliveryDate: null,
                    terminal: true
                }
            ];

            const presented = await present(events, {
                deliveryDays: 4,
                destinationTimezone
            });

            expect(presented.expectedDeliveryDate).to.eq(tomorrow);
        });

        it('EDD = EDD + 1 if no delivery or delivered events exist and EDD is today', async () => {
            const destinationTimezone = 'UTC';

            const today = getToday(destinationTimezone).toISO();
            const plusOne = getFutureDeliveryDate(destinationTimezone, 1);

            const events = [
                {
                    timestamp: today,
                    externalStatus: 'Label Created',
                    message: 'Label Created',
                    location: {
                        city: 'Austin',
                        state: 'TX',
                        zip: null,
                        lat: null,
                        lng: null,
                        timezone: null
                    },
                    terminal: true,
                    expectedDeliveryDate: null
                },
                {
                    timestamp: plusOne,
                    externalStatus: 'In-Transit',
                    message: 'In-Transit',
                    location: {
                        city: 'Austin',
                        state: 'TX',
                        zip: null,
                        lat: null,
                        lng: null,
                        timezone: null
                    },
                    terminal: true,
                    expectedDeliveryDate: null
                },
                {
                    timestamp: plusOne,
                    externalStatus: 'In-Transit',
                    message: 'In Transit',
                    location: {
                        city: 'Austin',
                        state: 'TX',
                        zip: null,
                        lat: null,
                        lng: null,
                        timezone: null
                    },
                    terminal: true,
                    expectedDeliveryDate: today
                }
            ];

            const presented = await present(events, {
                deliveryDays: 4,
                destinationTimezone
            });

            expect(presented.expectedDeliveryDate).to.eq(plusOne);
        });

        it('EDD lines up with final timestamp if final event is return to sender', async () => {
            const destinationTimezone = 'UTC';
            const { today, yesterday } = await factory.create('expectedDeliveryDates', {
                timezone: 'UTC',
                destinationTimezone
            });

            const events = [
                {
                    timestamp: yesterday,
                    externalStatus: 'Label Created',
                    message: 'Label Created',
                    location: {
                        city: 'Austin',
                        state: 'TX',
                        zip: null,
                        lat: null,
                        lng: null,
                        timezone: null
                    },
                    terminal: true,
                    expectedDeliveryDate: null
                },
                {
                    timestamp: yesterday,
                    externalStatus: 'In-Transit',
                    message: 'In-Transit',
                    location: {
                        city: 'Austin',
                        state: 'TX',
                        zip: null,
                        lat: null,
                        lng: null,
                        timezone: null
                    },
                    expectedDeliveryDate: null
                },
                {
                    timestamp: today,
                    externalStatus: 'Return to Sender',
                    message: 'Return to Sender',
                    location: {
                        city: 'Austin',
                        state: 'TX',
                        zip: null,
                        lat: null,
                        lng: null,
                        timezone: null
                    },
                    expectedDeliveryDate: today
                }
            ];

            const presented = await present(events, {
                deliveryDays: 4,
                destinationTimezone
            });

            expect(presented.expectedDeliveryDate).to.eq(today);
        });

        it('EDD lines up with final timestamp if final event is Delivered', async () => {
            const destinationTimezone = 'UTC';
            const { today, yesterday } = await factory.create('expectedDeliveryDates', {
                timezone: 'UTC',
                destinationTimezone
            });

            const events = [
                {
                    timestamp: yesterday,
                    externalStatus: 'Label Created',
                    message: 'Label Created',
                    location: {
                        city: 'Austin',
                        state: 'TX',
                        zip: null,
                        lat: null,
                        lng: null,
                        timezone: null
                    },
                    expectedDeliveryDate: null,
                    terminal: true
                },
                {
                    timestamp: yesterday,
                    externalStatus: 'In-Transit',
                    message: 'In-Transit',
                    location: {
                        city: 'Austin',
                        state: 'TX',
                        zip: null,
                        lat: null,
                        lng: null,
                        timezone: null
                    },
                    expectedDeliveryDate: null
                },
                {
                    timestamp: today,
                    externalStatus: 'Delivered',
                    message: 'Delivered',
                    location: {
                        city: 'Austin',
                        state: 'TX',
                        zip: null,
                        lat: null,
                        lng: null,
                        timezone: null
                    },
                    expectedDeliveryDate: today
                }
            ];

            const presented = await present(events, {
                deliveryDays: 4,
                destinationTimezone
            });

            expect(presented.expectedDeliveryDate).to.eq(today);
        });

        it('Sets the timezone correctly if a delivery TZ is provided', async () => {
            const destinationTimezone = 'America/Los_Angeles';
            const { plusOne } = await factory.create('expectedDeliveryDates', {
                timezone: 'UTC',
                destinationTimezone
            });

            const events = [
                {
                    timestamp: new Date('2021-01-04T00:00:00.000Z').toISOString(), // monday
                    externalStatus: 'Label Created',
                    message: 'Label Created',
                    location: { city: 'Austin', state: 'TX' },
                    expectedDeliveryDate: null,
                    terminal: true
                },
                {
                    timestamp: new Date('2021-01-05T00:00:00.000Z').toISOString(),
                    externalStatus: 'In-Transit',
                    message: 'In-Transit',
                    location: { city: 'Austin', state: 'TX' },
                    expectedDeliveryDate: null,
                    terminal: true
                },
                {
                    timestamp: new Date('2021-01-06T00:00:00.000Z').toISOString(),
                    externalStatus: 'In-Transit',
                    message: 'In Transit',
                    location: { city: 'Austin', state: 'TX' },
                    expectedDeliveryDate: plusOne
                }
            ];

            const presented = await present(events, {
                deliveryDays: 4,
                destinationTimezone
            });

            expect(presented.expectedDeliveryDate).to.eq(plusOne);
        });

        it('returns the delivery date of the delivered event if delivered', async () => {
            const destinationTimezone = 'America/Los_Angeles';
            const today = getToday(destinationTimezone, true);

            const events = [
                {
                    timestamp: new Date('2021-01-04T00:00:00.000Z').toISOString(),
                    externalStatus: 'Label Created',
                    message: 'Label Created',
                    location: {
                        city: 'Austin',
                        state: 'TX',
                        zip: null,
                        lat: null,
                        lng: null,
                        timezone: null
                    },
                    expectedDeliveryDate: null,
                    terminal: true
                },
                {
                    timestamp: new Date('2021-01-05T00:00:00.000Z').toISOString(),
                    externalStatus: 'In-Transit',
                    message: 'In-Transit',
                    location: {
                        city: 'Austin',
                        state: 'TX',
                        zip: null,
                        lat: null,
                        lng: null,
                        timezone: null
                    },
                    expectedDeliveryDate: null,
                    signature: null,
                    signatureUrl: null,
                    terminal: true
                },
                {
                    timestamp: today,
                    externalStatus: 'Delivered',
                    message: 'Delivered',
                    location: {
                        city: 'Austin',
                        state: 'TX',
                        zip: null,
                        lat: null,
                        lng: null,
                        timezone: null
                    },
                    expectedDeliveryDate: today,
                    signature: null,
                    signatureUrl: null,
                    terminal: true
                }
            ];

            const presented = await present(events, {
                deliveryDays: 4,
                destinationTimezone
            });
            const expectedDeliveryDate = DateTime.fromISO(today)
                .setZone(destinationTimezone)
                .set({ hour: 20, minute: 0, second: 0, millisecond: 0 })
                .toISO();

            expect(presented.expectedDeliveryDate).to.eq(expectedDeliveryDate);
        });

        it('adds + 1 to today if EDD is in the past', async () => {
            const destinationTimezone = 'America/Chicago';
            const todayLastYear = DateTime.now().startOf('day').minus({ years: 1 });
            const todayLastYearPlusOne = todayLastYear.plusBusiness({ days: 1 });

            const events = [
                {
                    timestamp: todayLastYear.toISO(),
                    externalStatus: 'Label Created',
                    message: 'Label Created',
                    location: { city: 'Austin', state: 'TX' },
                    terminal: true,
                    expectedDeliveryDate: null
                },
                {
                    timestamp: todayLastYearPlusOne.toISO(),
                    externalStatus: 'In-Transit',
                    message: 'In-Transit',
                    location: { city: 'Austin', state: 'TX' },
                    terminal: true,
                    expectedDeliveryDate: null
                },
                {
                    timestamp: todayLastYearPlusOne.toISO(),
                    externalStatus: 'In-Transit',
                    message: 'In Transit',
                    location: { city: 'Austin', state: 'TX' },
                    terminal: true,
                    expectedDeliveryDate: todayLastYearPlusOne.toISO()
                }
            ];

            const presented = await present(events, {
                deliveryDays: 10,
                destinationTimezone
            });

            const tomorrowBusiness = getFutureDeliveryDate(destinationTimezone);

            expect(presented.expectedDeliveryDate).to.eq(tomorrowBusiness);
        });

        it('adds + 3 to today if the package is not yet with the final mile carrier', async () => {
            const destinationTimezone = 'America/Chicago';
            const todayLastYear = DateTime.now().startOf('day').minus({ years: 1 });
            const todayLastYearPlusOne = todayLastYear.plusBusiness({ days: 1 });

            const events = [
                {
                    timestamp: todayLastYear.toISO(),
                    externalStatus: 'Label Created',
                    message: 'Label Created',
                    location: { city: 'Austin', state: 'TX' },
                    expectedDeliveryDate: null,
                    terminal: true
                },
                {
                    timestamp: todayLastYearPlusOne.toISO(),
                    externalStatus: 'In-Transit',
                    message: 'In-Transit',
                    location: { city: 'Austin', state: 'TX' },
                    expectedDeliveryDate: null
                },
                {
                    timestamp: todayLastYearPlusOne.toISO(),
                    externalStatus: 'In-Transit',
                    message: 'In Transit',
                    location: { city: 'Austin', state: 'TX' },
                    expectedDeliveryDate: todayLastYearPlusOne.toISO()
                }
            ];

            const presented = await present(events, {
                deliveryDays: 10,
                destinationTimezone
            });

            const threeBusinessDays = getFutureDeliveryDate(destinationTimezone, 3);

            expect(presented.expectedDeliveryDate).to.eq(threeBusinessDays);
        });

        it('does not present hidden events', async () => {
            const destinationTimezone = 'America/Chicago';

            const events = [
                {
                    timestamp: '2021-02-01T00:00:00.000Z',
                    externalStatus: 'Label Created',
                    message: 'Label Created',
                    location: {
                        city: 'Austin',
                        state: 'TX',
                        zip: null,
                        lat: null,
                        lng: null,
                        timezone: null
                    },
                    expectedDeliveryDate: null
                },
                {
                    timestamp: '2021-02-02T00:00:00.000Z',
                    externalStatus: 'Out for Delivery',
                    message: 'OUT FOR DELIVERY',
                    location: {
                        city: 'Austin',
                        state: 'TX',
                        zip: null,
                        lat: null,
                        lng: null,
                        timezone: null
                    },
                    expectedDeliveryDate: null,
                    hidden: true
                },
                {
                    timestamp: '2021-02-02T00:00:00.000Z',
                    externalStatus: 'In-Transit',
                    message: 'In Transit',
                    location: {
                        city: 'Austin',
                        state: 'TX',
                        zip: null,
                        lat: null,
                        lng: null,
                        timezone: null
                    },
                    expectedDeliveryDate: null
                }
            ];
            const presented = await present(events);

            expect(presented).to.eql({
                status: 'In-Transit',
                expectedDeliveryDate: getFutureDeliveryDate(destinationTimezone, 3),
                events: [{
                    timestamp: '2021-02-01T00:00:00.000Z',
                    status: 'Label Created',
                    message: 'Label Created',
                    location: {
                        city: 'Austin',
                        state: 'TX',
                        zip: null,
                        lat: null,
                        lng: null,
                        timezone: null
                    },
                    expectedDeliveryDate: null,
                    signature: null,
                    signatureUrl: null
                },
                {
                    timestamp: new Date('2021-02-02T00:00:00.000Z').toISOString(),
                    status: 'In-Transit',
                    message: 'In Transit',
                    location: {
                        city: 'Austin',
                        state: 'TX',
                        zip: null,
                        lat: null,
                        lng: null,
                        timezone: null
                    },
                    expectedDeliveryDate: null,
                    signature: null,
                    signatureUrl: null
                }]
            });
        });

        it('does not present events prior to Label Created - regardless of order', async () => {
            const today = getToday().toISO();
            const yesterday = getPastDeliveryDate('America/Chicago', 1);
            const plusOne = getFutureDeliveryDate('America/Chicago', 1);
            const plusThree = getFutureDeliveryDate('America/Chicago', 3);

            const events = [
                {
                    timestamp: plusOne,
                    externalStatus: 'In-Transit',
                    message: 'In Transit',
                    location: { city: 'Austin', state: 'TX' },
                    expectedDeliveryDate: null
                },
                {
                    timestamp: '2021-02-02T00:00:00.000Z',
                    externalStatus: 'Out for Delivery',
                    message: 'OUT FOR DELIVERY',
                    location: { city: 'Austin', state: 'TX' },
                    expectedDeliveryDate: null
                },
                {
                    timestamp: '2021-02-01T00:00:00.000Z',
                    externalStatus: 'In-Transit',
                    message: 'In Transit',
                    location: { city: 'Austin', state: 'TX' },
                    expectedDeliveryDate: null
                },
                {
                    timestamp: today,
                    externalStatus: 'Label Created',
                    message: 'Label Created',
                    location: { city: 'Austin', state: 'TX' },
                    expectedDeliveryDate: null
                },
                {
                    timestamp: yesterday,
                    externalStatus: 'In-Transit',
                    message: 'In Transit',
                    location: { city: 'Austin', state: 'TX' },
                    expectedDeliveryDate: null
                }
            ];

            expect(await present(events)).to.eql({
                status: 'In-Transit',
                expectedDeliveryDate: plusThree,
                events: [{
                    timestamp: today,
                    status: 'Label Created',
                    message: 'Label Created',
                    location: {
                        city: 'Austin',
                        state: 'TX',
                        zip: null,
                        lat: null,
                        lng: null,
                        timezone: null
                    },
                    expectedDeliveryDate: null,
                    signature: null,
                    signatureUrl: null
                },
                {
                    timestamp: plusOne,
                    status: 'In-Transit',
                    message: 'In Transit',
                    location: {
                        city: 'Austin',
                        state: 'TX',
                        zip: null,
                        lat: null,
                        lng: null,
                        timezone: null
                    },
                    expectedDeliveryDate: null,
                    signature: null,
                    signatureUrl: null
                }]
            });
        });

        it('filters both hidden and pre-Label events', async () => {
            const today = getToday().toISO();
            const yesterday = getPastDeliveryDate('America/Chicago', 1);
            const plusOne = getFutureDeliveryDate('America/Chicago', 1);

            const events = [
                {
                    timestamp: plusOne,
                    externalStatus: 'Somewhere In Idaho',
                    message: 'Potatoed',
                    location: {
                        city: '??',
                        state: 'ID',
                        zip: null,
                        lat: null,
                        lng: null,
                        timezone: null
                    },
                    expectedDeliveryDate: null
                },
                {
                    timestamp: plusOne,
                    externalStatus: 'In-Transit',
                    message: 'In Transit',
                    location: {
                        city: 'Austin',
                        state: 'TX',
                        zip: null,
                        lat: null,
                        lng: null,
                        timezone: null
                    },
                    expectedDeliveryDate: null,
                    hidden: true
                },
                {
                    timestamp: '2021-02-02T00:00:00.000Z',
                    externalStatus: 'Out for Delivery',
                    message: 'OUT FOR DELIVERY',
                    location: {
                        city: 'Austin',
                        state: 'TX',
                        zip: null,
                        lat: null,
                        lng: null,
                        timezone: null
                    },
                    expectedDeliveryDate: null
                },
                {
                    timestamp: '2021-02-01T00:00:00.000Z',
                    externalStatus: 'In-Transit',
                    message: 'In Transit',
                    location: {
                        city: 'Austin',
                        state: 'TX',
                        zip: null,
                        lat: null,
                        lng: null,
                        timezone: null
                    },
                    expectedDeliveryDate: null
                },
                {
                    timestamp: today,
                    externalStatus: 'Label Created',
                    message: 'Label Created',
                    location: {
                        city: 'Austin',
                        state: 'TX',
                        zip: null,
                        lat: null,
                        lng: null,
                        timezone: null
                    },
                    expectedDeliveryDate: null
                },
                {
                    timestamp: yesterday,
                    externalStatus: 'In-Transit',
                    message: 'In Transit',
                    location: {
                        city: 'Austin',
                        state: 'TX',
                        zip: null,
                        lat: null,
                        lng: null,
                        timezone: null
                    },
                    expectedDeliveryDate: null
                }
            ];

            expect(await present(events)).to.eql({
                status: 'Somewhere In Idaho',
                expectedDeliveryDate: getFutureDeliveryDate('America/Chicago', 3),
                events: [{
                    timestamp: today,
                    status: 'Label Created',
                    message: 'Label Created',
                    location: {
                        city: 'Austin',
                        state: 'TX',
                        zip: null,
                        lat: null,
                        lng: null,
                        timezone: null
                    },
                    expectedDeliveryDate: null,
                    signature: null,
                    signatureUrl: null
                },
                {
                    timestamp: plusOne,
                    status: 'Somewhere In Idaho',
                    message: 'Potatoed',
                    location: {
                        city: '??',
                        state: 'ID',
                        zip: null,
                        lat: null,
                        lng: null,
                        timezone: null
                    },
                    expectedDeliveryDate: null,
                    signature: null,
                    signatureUrl: null
                }]
            });
        });

        it('hides all if label created is hidden', async () => {
            const {
                today,
                yesterday,
                plusOne
            } = await factory.create('expectedDeliveryDates', { timezone: 'UTC' });

            const events = [
                {
                    timestamp: plusOne,
                    externalStatus: 'Somewhere In Idaho',
                    message: 'Potatoed',
                    location: {
                        city: '??',
                        state: 'ID',
                        zip: null,
                        lat: null,
                        lng: null,
                        timezone: null
                    },
                    expectedDeliveryDate: null
                },
                {
                    timestamp: plusOne,
                    externalStatus: 'In-Transit',
                    message: 'In Transit',
                    location: {
                        city: 'Austin',
                        state: 'TX',
                        zip: null,
                        lat: null,
                        lng: null,
                        timezone: null
                    },
                    expectedDeliveryDate: null,
                    hidden: true
                },
                {
                    timestamp: '2021-02-02T00:00:00.000Z',
                    externalStatus: 'Out for Delivery',
                    message: 'OUT FOR DELIVERY',
                    location: {
                        city: 'Austin',
                        state: 'TX',
                        zip: null,
                        lat: null,
                        lng: null,
                        timezone: null
                    },
                    expectedDeliveryDate: null
                },
                {
                    timestamp: '2021-02-01T00:00:00.000Z',
                    externalStatus: 'In-Transit',
                    message: 'In Transit',
                    location: {
                        city: 'Austin',
                        state: 'TX',
                        zip: null,
                        lat: null,
                        lng: null,
                        timezone: null
                    },
                    expectedDeliveryDate: null
                },
                {
                    timestamp: today,
                    externalStatus: 'Label Created',
                    message: 'Label Created',
                    location: {
                        city: 'Austin',
                        state: 'TX',
                        zip: null,
                        lat: null,
                        lng: null,
                        timezone: null
                    },
                    expectedDeliveryDate: null,
                    hidden: true
                },
                {
                    timestamp: yesterday,
                    externalStatus: 'In-Transit',
                    message: 'In Transit',
                    location: {
                        city: 'Austin',
                        state: 'TX',
                        zip: null,
                        lat: null,
                        lng: null,
                        timezone: null
                    },
                    expectedDeliveryDate: null
                }
            ];

            expect(await present(events)).to.eql({
                status: 'Unknown',
                events: []
            });
        });
    });
});
