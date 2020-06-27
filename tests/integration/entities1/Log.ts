
import { Either } from '../../../src/util/Either.js';

import * as D from '../../../src/modules/Decoding.js';
import * as Entity from './Entity.js';


const Entity_ = <A, C extends { new (instance : A) : A }>(decoder : D.Decoder<A>) => class Entity {
    static decode(this : C, input : unknown) {
        if (typeof this !== 'function' || !((this as C).prototype instanceof Entity)) {
            throw new TypeError(`decode() must be called on an Entity class`);
        }
        
        const Self : C = this;
        
        if (typeof input === 'object' && input !== null && input instanceof Self) {
            return Either.right(input as C & A);
        }
        return Either.map(decoder.decode(input), instance => new Self(instance));
    }
    
    constructor(instance : A) {
        Object.assign(this, instance);
    }
};

export const LogT = D.record({
    name: D.string,
});
export type LogT = D.TypeOf<typeof LogT>;

export interface Log extends LogT {}
export class Log extends Entity_(LogT) {
    formatName() {
        return `name: ${this.name}`;
    }
}
