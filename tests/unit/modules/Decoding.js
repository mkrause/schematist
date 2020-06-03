
import { expect } from 'chai';

import * as D from '../../../lib-esm/modules/Decoding.js';


describe('Decoding', () => {
    const various = [undefined, null, 'x', 42, NaN, Infinity, true, false, {}, { x: 42 }, [], [1, 2, 3], x => x + 1];
    
    if (typeof BigInt === 'function') {
        various.push(999n);
    }
    
    describe('unknown', () => {
        it('should be decodable from anything', () => {
            various.forEach(value => {
                expect(D.unknown.decode(value)).to.deep.equal({ right: value });
            });
        });
    });
    
    describe('never', () => {
        it('should be decodable from nothing', () => {
            various.forEach(value => {
                expect(D.never.decode(value)).to.deep.equal({ left: { type: 'never' } });
            });
        });
    });
    
    describe('unit', () => {
        it('should be decodable from unit', () => {
            various.filter(value => value !== null).forEach(value => {
                expect(D.unit.decode(value)).to.deep.equal({ left: { type: 'unexpected-type' } });
            });
            
            expect(D.unit.decode(null)).to.deep.equal({ right: null });
        });
    });
    
    describe('undef', () => {
        it('should be decodable from undefined', () => {
            various.filter(value => typeof value !== 'undefined').forEach(value => {
                expect(D.undef.decode(value)).to.deep.equal({ left: { type: 'unexpected-type' } });
            });
            
            expect(D.undef.decode(undefined)).to.deep.equal({ right: undefined });
        });
    });
    
    describe('string', () => {
        it('should be decodable from string', () => {
            various.filter(value => typeof value !== 'string').forEach(value => {
                expect(D.string.decode(value)).to.deep.equal({ left: { type: 'unexpected-type' } });
            });
            
            ['', 'x', 'テスト', '🙂'].forEach(value => {
                expect(D.string.decode(value)).to.deep.equal({ right: value });
            });
        });
    });
    
    describe('number', () => {
        it('should be decodable from number', () => {
            various.filter(value => typeof value !== 'number').forEach(value => {
                expect(D.number.decode(value)).to.deep.equal({ left: { type: 'unexpected-type' } });
            });
            
            [0, 42, -1, 0.5, NaN, Infinity, -Infinity].forEach(value => {
                expect(D.number.decode(value)).to.deep.equal({ right: value });
            });
        });
    });
    
    describe('boolean', () => {
        it('should be decodable from boolean', () => {
            various.filter(value => typeof value !== 'boolean').forEach(value => {
                expect(D.boolean.decode(value)).to.deep.equal({ left: { type: 'unexpected-type' } });
            });
            
            [true, false].forEach(value => {
                expect(D.boolean.decode(value)).to.deep.equal({ right: value });
            });
        });
    });
    
    describe('literal', () => {
        it('should be decodable from the given literal', () => {
            // Note: NaN does not equal NaN, so need to test that case specially
            const variousEquatable = various.filter(value => typeof value !== 'number' || !isNaN(value));
            
            variousEquatable.forEach(literal => {
                expect(D.literal(literal).decode(literal)).to.deep.equal({ right: literal });
            });
            
            variousEquatable.forEach(literal => {
                variousEquatable.filter(value => value !== literal).forEach(value => {
                    expect(D.literal(literal).decode(value)).to.deep.equal({ left: { type: 'unexpected-type' } });
                });
            });
            
            // NaN should not decode itself (keeping in the spirit of "NaN does not equate itself")
            expect(D.literal(NaN).decode(NaN)).to.deep.equal({ left: { type: 'unexpected-type' } });
        });
    });
});
