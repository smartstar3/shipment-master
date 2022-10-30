// models/olxtracker.js -- OLX proprietary tracking number
//
const Sequence = require('./sequence');
const { getProp } = require('../helpers/utils');

const TNS_LENGTH = 17; // length of tracking number string

const originDate = '2020-01-01';
const base32map = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F',
    'G', 'H', 'J', 'K', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'V', 'W', 'X', 'Y', 'Z'];

// Tracking number class
//
// NOTE: this constructor returns a Promise()!!!
// usage: const newtracker = await new OlxTracker( args );
//
class OlxTracker {
    constructor (cob) {
        // start with empty information
        this._version = '1.0';
        this._tns = null;
        this._shipper = null;
        this._lane = null;
        this._date = null;
        this._seqnum = null;
        this._sequenceId = 'OlxTracker';
        this._header = 'XLX';
        switch (typeof cob) {
        case 'string': // we have been passed an existing TN as a string
            if (!OlxTracker.checkCb32(cob)) throw new Error(`OlxTracker.constructor: invalid TN ${cob}`);
            this._tns = cob;
            break;

        case 'object':
            if (cob instanceof OlxTracker) {
                // we have been passed an existing TN to clone
                this._tns = cob._tns;
            } else {
                if (cob.shipper === undefined || cob.lane === undefined) throw new Error(`OlxTracker.constructor: invalid object ${cob}`);
                // we have been passed an object of discrete elements, create new TN
                this._shipper = cob.shipper;
                this._lane = cob.lane;
                this._date = Math.trunc((Date.now() - new Date(originDate)) / (1000 * 60 * 60 * 24)); // days since origin time
                if (cob.sequenceId) this._sequenceId = cob.sequenceId;
                if (cob.header) this._header = cob.header;
            }
            break;

        default:
            throw new Error(`OlxTracker.constructor: invalid argument ${cob}`);
        }
        return (async () => {
            if (this._tns != null) {
                // extract individual items from TN
                const dc = OlxTracker.Decompose(this._tns);
                this._shipper = dc.shipper;
                this._lane = dc.lane;
                this._date = dc.date;
                this._seqnum = dc.seqnum;
                this._header = dc.header;
            } else {
                // build TN from individual items
                this._seqnum = await Sequence.nextseq(this._sequenceId);
                this._tns = OlxTracker.Compose({ header: this._header, shipper: this._shipper, lane: this._lane, date: this._date, seqnum: this._seqnum });
            }
            return this;
        })();
    }

    toString () {
        return this._tns;
    }

    // compose TN from arguments
    //
    static Compose (obj) {
        return OlxTracker.setCb32CheckDigit(obj.header + OlxTracker.int2Cb32(obj.shipper, 3) + OlxTracker.int2Cb32(obj.lane, 2) + OlxTracker.int2Cb32(obj.date, 3) +
                                             OlxTracker.int2Cb32(obj.seqnum, 5));
    }

    // decompose CURRENT VERSION tracking number
    //
    static Decompose (tns) {
        const retobj = {};
        if (!(typeof tns === 'string' && tns.length === TNS_LENGTH && OlxTracker.checkCb32(tns))) throw new Error(`OlxTracker.Decompose invalid tns ${tns}`);
        retobj.header = OlxTracker.cb322Int(tns.slice(0, 3));
        retobj.shipper = OlxTracker.cb322Int(tns.slice(3, 6));
        retobj.lane = OlxTracker.cb322Int(tns.slice(6, 8));
        retobj.date = OlxTracker.cb322Int(tns.slice(8, 11));
        retobj.seqnum = OlxTracker.cb322Int(tns.slice(11, 16));
        return retobj;
    }

    // base32 utilities
    // implementaion of Crockford's Base32 (cb32)

    // c2nbase32() - called w/ a single character string
    //
    static c2nCb32 (cstr) {
        let cup = cstr.toUpperCase();
        if (['O'].includes(cup)) cup = '0';
        if (['I', 'L'].includes(cup)) cup = '1';
        if (!base32map.includes(cup)) throw new RangeError(`Invalid encoded B32 value: ${cup}`);
        return base32map.indexOf(cup);
    }

    // n2cbase32() - called with n [0..31]
    //
    static n2cCb32 (n) {
        if (n < 0 || n >= base32map.length) throw new RangeError(`Out of range: ${n}`);
        return getProp(base32map, n);
    }

    // genLuhnCb32() -- caculate Luhn-base32 check character for string of base32 digits
    //
    static genLuhnCb32 (cb32str) {
        let lsum = 0;
        for (let i = 0, odd = 0; i < cb32str.length; ++i, odd = 1 - odd) {
            if (odd) lsum += OlxTracker.c2nCb32(cb32str.charAt(i));
            else {
                const nsum = OlxTracker.c2nCb32(cb32str.charAt(i)) * 2;
                lsum += nsum > 31 ? nsum - 31 : nsum;
            }
        }
        return base32map[(lsum * 31) % 32];
    }

    // int2Cb32() -- encode an integer into cb32 string
    // called w/ int, len( in cb32 chars)
    //
    static int2Cb32 (num, ln) {
        let cb32str = '';
        let mn = num;
        if (mn < 0) throw new RangeError(`Out of range: ${num}`);
        while (ln--) {
            cb32str = OlxTracker.n2cCb32(mn % 32) + cb32str;
            mn = Math.trunc(mn / 32);
        }
        if (mn > 0) throw new RangeError(`Out of range: ${num}`);
        return cb32str;
    }

    // cb322Int() - decode cb32 string to integer
    //
    static cb322Int (cb32str) {
        let rn = 0;
        for (let i = 0; i < cb32str.length; ++i) rn = rn * 32 + OlxTracker.c2nCb32(cb32str.charAt(i));
        return rn;
    }

    // setCb32CheckDigit() - append the check digit to string
    //
    static setCb32CheckDigit (str) {
        return str + OlxTracker.genLuhnCb32(str);
    }

    // checkCb32() validate passed string against its check digit
    //
    static checkCb32 (str) {
        const chk = OlxTracker.c2nCb32(str.slice(-1));
        return OlxTracker.c2nCb32(OlxTracker.genLuhnCb32(str.slice(0, -1))) === chk;
    }
}

module.exports = OlxTracker;
