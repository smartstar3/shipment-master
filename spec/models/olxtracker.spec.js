const { expect, factory } = require('chai');

const OlxTracker = require('../../app/models/olxtracker');

describe('OlxTracker Model', () => {
    it('can construct without custom header and sequence', async () => {
        await factory.create('sequence', { name: 'OlxTracker' });
        const trackingNum = await new OlxTracker({ shipper: 1, lane: 0 });
        const trackingStr = trackingNum.toString();
        expect(trackingStr.length).to.eq(17);
        expect(trackingStr.slice(0, 3)).to.eq('XLX');
    });

    it('can construct with a custom header and sequence', async () => {
        const SEQUENCE_NAME = 'Abc Sequence';
        await factory.create('sequence', { name: SEQUENCE_NAME });
        const trackingNum = await new OlxTracker({ shipper: 1, lane: 0, sequenceId: SEQUENCE_NAME, header: 'ABC' });
        const trackingStr = trackingNum.toString();
        expect(trackingStr.length).to.eq(17);
        expect(trackingStr.slice(0, 3)).to.eq('ABC');
    });

    it('can construct with a custom tracking string', async () => {
        const trackingNum = await new OlxTracker('ABC001000FR000008');
        const trackingStr = trackingNum.toString();
        expect(trackingStr.length).to.eq(17);
        expect(trackingStr.slice(0, 3)).to.eq('ABC');
    });
});
