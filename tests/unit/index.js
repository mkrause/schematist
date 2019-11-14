
import chai, { assert, expect } from 'chai';

import { Either } from '../../lib-esm/util/Either.js';
import * as s from '../../lib-esm/index.js';


describe('schematist', () => {
    it('should decode string from string literal', () => {
        expect(s.string.decode('x')).to.deep.equal(Either.right('x'));
    });
    it('should fail to decode string from non-string', () => {
        expect(s.string.decode(42)).to.satisfy(result => Either.isLeft(result));
    });
});
