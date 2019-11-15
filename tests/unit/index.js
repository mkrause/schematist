
import chai, { assert, expect } from 'chai';

import { Either } from '../../lib-esm/util/Either.js';
import * as s from '../../lib-esm/index.js';


describe('schematist', () => {
    describe('string', () => {
        it('should decode string from string literal', () => {
            expect(s.string.decode('x')).to.deep.equal(Either.right('x'));
        });
        it('should fail to decode string from non-string', () => {
            expect(s.string.decode(42)).to.satisfy(result => Either.isLeft(result));
        });
    });
    
    describe('union', () => {
        it('should decode', () => {
            const maybeString = s.union([s.unit, s.string]);
            
            expect(maybeString.decode(null)).to.deep.equal(Either.right(null));
            expect(maybeString.decode('x')).to.deep.equal(Either.right('x'));
            expect(maybeString.decode(42)).to.satisfy(result => Either.isLeft(result));
        });
    });
    
    describe('record', () => {
        it('should decode', () => {
            const User = s.record({
                name: s.string,
                score: s.number,
            });
            
            const john = {
                name: 'John',
                score: 42,
            };
            expect(User.decode(john)).to.deep.equal(Either.right(john));
        });
        
        it('should support optional properties', () => {
            const User = s.record({
                name: s.string,
                score: s.number,
                foo: s.optional(s.string),
            });
            
            const john = {
                name: 'John',
                score: 42,
            };
            expect(User.decode(john)).to.deep.equal(Either.right({
                name: 'John',
                score: 42,
                foo: undefined,
            }));
        });
    });
    
    describe('dict', () => {
        it('should decode', () => {
            const User = s.record({
                name: s.string,
                score: s.number,
            });
            const UserCollection = s.dict(User);
            
            const users = {
                john: {
                    name: 'John',
                    score: 42,
                },
            };
            expect(UserCollection.decode(users)).to.deep.equal(Either.right(users));
        });
    });
    
    describe('custom decoders', () => {
        it('should ...', () => {
            const DateS = s.number;
            /*
            const DateS = s.extend(s.number, {
                decode(input : unknown) {
                    if (input instanceof Date) {
                        return s.number.decode(input.toTimestamp());
                    } else {
                        return s.number.decode(input);
                    }
                },
            });
            */
            
            const User = s.record({
                name: s.string,
                score: s.number,
                registrationDate: DateS,
            });
            
            const john = {
                name: 'John',
                score: 42,
                registrationDate: new Date(),
            };
            // expect(User.decode(john)).to.deep.equal(Either.right(john));
        });
    });
});
