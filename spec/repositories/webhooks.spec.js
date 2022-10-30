const { expect, factory } = require('chai');

const { buildNotifications } = require('../../app/repositories/webhooks');

describe('Webhooks Repository', () => {
    describe('buildNotification', () => {
        it('builds a notification', async () => {
            const liveSegment = await factory.create('liveSegment');
            const event = await factory.create('event', { liveSegmentId: liveSegment._id });
            const shipment = await factory.create('shipment', {
                docs: [{
                    vendor: liveSegment.provider,
                    doc: { trackingNumber: liveSegment.trackingNumber }
                }]
            });
            const webhook = await factory.create('webhook', { shipper: shipment.shipper });
            const otherWebhook = await factory.create('webhook', { shipper: shipment.shipper });

            const notifications = await buildNotifications(event, liveSegment, { shipment });
            expect(notifications).to.eql([
                {
                    requestor: { shipper: shipment.shipper },
                    request: {
                        url: webhook.url,
                        body: {
                            type: 'event',
                            payload: {
                                trackingNumber: shipment.tn,
                                barcode: liveSegment.trackingNumber,
                                expectedDeliveryDate: event.expectedDeliveryDate,
                                location: {
                                    city: event.location.city || null,
                                    lat: event.location.lat || null,
                                    lng: event.location.lng || null,
                                    state: event.location.state || null,
                                    timezone: event.location.timezone || null,
                                    zip: event.location.zip || null
                                },
                                message: event.message,
                                signature: event.signature,
                                signatureUrl: event.signatureUrl,
                                status: event.externalStatus,
                                timestamp: event.timestamp
                            }
                        }
                    }
                },
                {
                    requestor: { shipper: shipment.shipper },
                    request: {
                        url: otherWebhook.url,
                        body: {
                            type: 'event',
                            payload: {
                                trackingNumber: shipment.tn,
                                barcode: liveSegment.trackingNumber,
                                expectedDeliveryDate: event.expectedDeliveryDate,
                                location: {
                                    city: event.location.city || null,
                                    lat: event.location.lat || null,
                                    lng: event.location.lng || null,
                                    state: event.location.state || null,
                                    timezone: event.location.timezone || null,
                                    zip: event.location.zip || null
                                },
                                message: event.message,
                                signature: event.signature,
                                signatureUrl: event.signatureUrl,
                                status: event.externalStatus,
                                timestamp: event.timestamp
                            }
                        }
                    }
                }
            ]);
        });

        it('returns null if no webhooks configured', async () => {
            const liveSegment = await factory.create('liveSegment');
            const event = await factory.create('event', { liveSegmentId: liveSegment._id });
            const shipment = await factory.create('shipment', {
                docs: [{
                    vendor: liveSegment.provider,
                    doc: { trackingNumber: liveSegment.trackingNumber }
                }]
            });

            expect(await buildNotifications(event, liveSegment, { shipment })).to.eql([]);
        });
    });
});
