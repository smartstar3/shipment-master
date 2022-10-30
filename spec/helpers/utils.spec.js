const { expect } = require('chai');

const { hasProp, getProp, setProp } = require('../../app/helpers/utils');

const fn = function () {};
fn.foo = 'bar';

class Foo {
    static foo = 'bar';
    foo = 'bar';

    static fooFn () {}
    fooFn () {}
}

describe('hasProp', () => {
    for (const [obj, name, expected] of [
        [{ foo: 'bar' }, 'foo', true],
        [{ foo: 'bar' }, 'bar', false],
        [{ foo: 'bar' }, 'constructor', false],
        [fn, 'foo', true],
        [fn, 'bar', false],
        [fn, 'constructor', false],
        [Foo, 'foo', true],
        [Foo, 'fooFn', true],
        [Foo, 'bar', false],
        [Foo, 'constructor', false],
        [new Foo(), 'foo', true],
        [new Foo(), 'fooFn', false], // ES6 instance methods unsupported
        [new Foo(), 'bar', false],
        [new Foo(), 'constructor', false],
        [null, 'constructor', false],
        [undefined, 'constructor', false],
        [true, 'constructor', false],
        [1, 'constructor', false],
        ['foo', 'constructor', false],
        [1n, 'constructor', false],
        [Symbol('foo'), 'constructor', false]

    ]) {
        it(`returns ${expected} for property ${name} of ${obj?.toString()}`, () => {
            expect(hasProp(obj, name)).to.eq(expected);
        });
    }
});

describe('getProp', () => {
    for (const [obj, name, expected] of [
        [{ foo: 'bar' }, 'foo', 'bar'],
        [{ foo: 'bar' }, 'bar', undefined],
        [{ foo: 'bar' }, 'constructor', undefined],
        [fn, 'foo', 'bar'],
        [fn, 'bar', undefined],
        [fn, 'constructor', undefined],
        [Foo, 'foo', 'bar'],
        [Foo, 'fooFn', Foo.fooFn],
        [Foo, 'bar', undefined],
        [Foo, 'constructor', undefined],
        [new Foo(), 'foo', 'bar'],
        [new Foo(), 'fooFn', undefined], // ES6 instance methods unsupported
        [new Foo(), 'bar', undefined],
        [new Foo(), 'constructor', undefined],
        [null, 'constructor', undefined],
        [undefined, 'constructor', undefined],
        [true, 'constructor', undefined],
        [1, 'constructor', undefined],
        ['foo', 'constructor', undefined],
        [1n, 'constructor', undefined],
        [Symbol('foo'), 'constructor', undefined]

    ]) {
        it(`returns ${expected} for property ${name} of ${obj?.toString()}`, () => {
            expect(getProp(obj, name)).to.eq(expected);
        });
    }
});

describe('setProp', () => {
    for (const [obj, name, expected] of [
        [{}, 'foo', 'bar'],
        [function () {}, 'foo', 'bar'],
        [new Foo(), 'foo', 'bar']
    ]) {
        it(`sets ${expected} for property ${name} of ${obj?.toString()}`, () => {
            setProp(obj, name, expected);
            expect(obj[name]).to.eq(expected);
        });
    }

    for (const obj of [
        {},
        fn,
        Foo,
        new Foo(),
        null,
        undefined,
        true,
        1,
        'foo',
        1n,
        Symbol('foo')
    ]) {
        it(`fails when setting invalid for ${obj?.toString()}`, () => {
            expect(() => { setProp(obj, 'constructor', 'foo'); }).to.throw(Error);
        });
    }
});
