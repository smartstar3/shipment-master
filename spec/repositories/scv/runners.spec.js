const nock = require('nock');
const { expect, factory } = require('chai');
const { InMemoryWorker } = require('scv');
const { PushNotificationRunner } = require('hermod');

const hermod = require('../../../app/repositories/hermod');
const kobayashi = require('../../../app/repositories/kobayashi');
const scv = require('../../../app/repositories/scv');
const transport = require('../../../app/repositories/transport');
const {
    DetermineNotifications,
    ProcessRowRunner
} = require('../../../app/repositories/scv/runners');

class Logger {
    info () {}
    error () {}
}

describe('ProcessRowRunner', () => {
    given('message', () => {
        return { _id: 'ABCDEF1234567890' };
    });
    given('runner', () => {
        return new ProcessRowRunner();
    });
    given('gateway', () => {
        return {
            ...kobayashi.getGateways(),
            ...transport.getGateways(),
            ...hermod.getGateways()
        };
    });

    it('does nothing if result is null', async () => {
        await given.runner.run(given.message, {
            row: { data: {} },
            source: { data: { provider: 'X' } }
        });

        expect(await given.gateway.events.findMany()).to.have.lengthOf(0);
        expect(await given.gateway.liveSegments.findMany()).to.have.lengthOf(0);
    });

    describe('transfer', () => {
        it('creates transport object', async () => {
            await given.runner.run(given.message, {
                row: {
                    data: {
                        container_number: 'OLX1565',
                        carrier_code: 'LASND',
                        tracking_number: 'D10012272685216',
                        first_name: 'Kimberly',
                        last_name: 'Kleopfer',
                        address1: '1827 WYCHWOOD ST',
                        city: 'TOLEDO',
                        state: 'OH',
                        zip: '43613-5243',
                        weight: '5.099',
                        length: '10',
                        width: '6',
                        height: '8',
                        uri: 's3://test-onelivex/transport/builtbar/EOD OLX Report 1_8_2021.csv'
                    }
                },
                source: { data: { provider: 'BuiltBar', transfer: true } }
            });

            expect(await given.gateway.events.findMany()).to.have.lengthOf(0);
            expect(await given.gateway.liveSegments.findMany()).to.have.lengthOf(2);
        });
    });

    describe('segment', () => {
        it('creates transport objects', async () => {
            await given.runner.run(given.message, {
                row: {
                    data: {
                        event_datetime: '02/03/2021 02:58:30 AM',
                        event_status_code: 'OS',
                        event_city: 'COMMERCE',
                        event_state: 'CA',
                        event_zip: '90040',
                        ship_date: '02/01/2021',
                        account: '215135',
                        tracking_number: 'D10012272685216',
                        expected_delivery_date: '02/03/2021',
                        service: 'C',
                        reference1: '2793765',
                        reported_lbs: '4',
                        billable_lbs: '4',
                        pickup_name: 'BUILT BAR',
                        pickup_street_number: '600',
                        pickup_street: 'E QUALITY DR',
                        pickup_city: 'AMERICAN FORK',
                        pickup_state: 'UT',
                        pickup_zip: '84003',
                        delivery_name: 'MATTHEW LUONG',
                        delivery_street_number: '627',
                        delivery_street: 'N LA FAYETTE PARK PL',
                        delivery_city: 'LOS ANGELES',
                        delivery_state: 'CA',
                        delivery_zip: '90026-2915'
                    }
                },
                source: { data: { provider: 'OnTrac' } },
                worker: scv.get()
            });

            const events = await given.gateway.events.findMany();
            expect(events).to.have.lengthOf(1);
            expect(await given.gateway.liveSegments.findMany()).to.have.lengthOf(1);
        });

        it('creates notification if shipment exists', async () => {
            const org = await factory.create('organization', {
                shipperSeqNum: 3 // Narvar only pushes notifications for certain customers.
            });
            await factory.create('shipment', {
                shipper: org.shipperSeqNum,
                docs: [{
                    vendor: 'OnTrac',
                    doc: { Tracking: 'D10012272685216' }
                }]
            });

            await given.runner.run(given.message, {
                row: {
                    data: {
                        event_datetime: '02/03/2021 02:58:30 AM',
                        event_status_code: 'OS',
                        event_city: 'COMMERCE',
                        event_state: 'CA',
                        event_zip: '90040',
                        ship_date: '02/01/2021',
                        account: '215135',
                        tracking_number: 'D10012272685216',
                        expected_delivery_date: '02/03/2021',
                        service: 'C',
                        reference1: '2793765',
                        reported_lbs: '4',
                        billable_lbs: '4',
                        pickup_name: 'BUILT BAR',
                        pickup_street_number: '600',
                        pickup_street: 'E QUALITY DR',
                        pickup_city: 'AMERICAN FORK',
                        pickup_state: 'UT',
                        pickup_zip: '84003',
                        delivery_name: 'MATTHEW LUONG',
                        delivery_street_number: '627',
                        delivery_street: 'N LA FAYETTE PARK PL',
                        delivery_city: 'LOS ANGELES',
                        delivery_state: 'CA',
                        delivery_zip: '90026-2915'
                    }
                },
                source: { data: { provider: 'OnTrac' } },
                worker: scv.get()
            });

            expect(await given.gateway.events.findMany()).to.have.lengthOf(1);
            expect(await given.gateway.liveSegments.findMany()).to.have.lengthOf(1);
            expect(await given.gateway.notifications.findMany()).to.have.lengthOf(1);
        });
    });
});

describe('DetermineNotifications', () => {
    given('runner', () => {
        return new DetermineNotifications();
    });
    given('gateway', () => {
        return {
            ...transport.getGateways(),
            ...hermod.getGateways()
        };
    });
    given('service', () => {
        return {
            buildNotifications: (event, liveSegment, { shipment }) => {
                return [{
                    requestor: { shipper: shipment.shipper },
                    request: {
                        url: 'https://www.foo.bar/webhook',
                        body: {
                            eventId: event._id.toString(),
                            liveSegmentId: liveSegment._id.toString()
                        }
                    }
                }];
            }
        };
    });
    given('worker', () => {
        return new InMemoryWorker(
            {
                determineNotifications: DetermineNotifications,
                pushNotification: PushNotificationRunner
            },
            { logger: new Logger(), gateway: given.gateway, services: [given.service] }
        );
    });

    describe('run', () => {
        it('enqueues notifications for event in terminal segment #novcr', async () => {
            const liveSegment = await factory.create('liveSegment', { terminal: true });
            const event = await factory.create('event', { liveSegmentId: liveSegment._id });
            await factory.create('shipment', {
                docs: [{
                    vendor: liveSegment.provider,
                    doc: { trackingNumber: liveSegment.trackingNumber }
                }]
            });

            nock('https://www.foo.bar')
                .post('/webhook', {
                    eventId: event._id.toString(),
                    liveSegmentId: liveSegment._id.toString()
                })
                .reply(200, { status: 'ok' });

            await given.runner.run({ _id: event._id.toString() }, {
                gateway: given.gateway,
                worker: given.worker,
                services: [given.service]
            });

            const notifications = await given.gateway.notifications.findMany();
            expect(notifications).to.have.lengthOf(1);
            expect(notifications[0].state).to.eq('COMPLETED');
        });

        it('enqueues notifications for event not in terminal segment #novcr', async () => {
            const liveSegment = await factory.create('liveSegment', { terminal: false });
            const terminalLiveSegment = await factory.create('liveSegment', {
                terminal: true,
                lane: [liveSegment._id]
            });
            const otherTerminalLiveSegment = await factory.create('liveSegment', {
                terminal: true,
                lane: [liveSegment._id]
            });
            const event = await factory.create('event', { liveSegmentId: liveSegment._id });
            await factory.create('shipment', {
                docs: [{
                    vendor: liveSegment.provider,
                    doc: { trackingNumber: terminalLiveSegment.trackingNumber }
                }]
            });
            await factory.create('shipment', {
                docs: [{
                    vendor: liveSegment.provider,
                    doc: { trackingNumber: otherTerminalLiveSegment.trackingNumber }
                }]
            });

            nock('https://www.foo.bar')
                .post('/webhook', {
                    eventId: event._id.toString(),
                    liveSegmentId: terminalLiveSegment._id.toString()
                })
                .reply(200, { status: 'ok' });
            nock('https://www.foo.bar')
                .post('/webhook', {
                    eventId: event._id.toString(),
                    liveSegmentId: otherTerminalLiveSegment._id.toString()
                })
                .reply(200, { status: 'ok' });

            await given.runner.run({ _id: event._id.toString(), limit: 1 }, {
                gateway: given.gateway,
                worker: given.worker,
                services: [given.service]
            });

            const notifications = await given.gateway.notifications.findMany();
            expect(notifications).to.have.lengthOf(2);
            expect(notifications[0].state).to.eq('COMPLETED');
            expect(notifications[1].state).to.eq('COMPLETED');
        });

        it('handles no shipment associated with event', async () => {
            const liveSegment = await factory.create('liveSegment', { terminal: true });
            const event = await factory.create('event', { liveSegmentId: liveSegment._id });

            await given.runner.run({ _id: event._id.toString() }, {
                gateway: given.gateway,
                worker: given.worker,
                services: [given.service]
            });

            const notifications = await given.gateway.notifications.findMany();
            expect(notifications).to.have.lengthOf(0);
        });
    });
});
