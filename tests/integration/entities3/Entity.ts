
import $msg from 'message-tag';
import { Either } from '../../../src/util/Either.js';

import * as D from '../../../src/modules/Decoding.js';


export const staticImplements = <T>() => {
    return <U extends T>(constructor : U) => constructor;
};


const Entity = <A, P>(decoder : D.Decoder<A>) => {
    interface Entity extends D.Decoder<A & P> {
        new (instance : A) : A & P,
    }
    
    class Entity {
        static decode<E extends Entity>(this : E, input : unknown) {
            if (typeof this !== 'function' || !(this.prototype instanceof Entity)) {
                throw new TypeError($msg`decode() must be called on an Entity class, given ${this}`);
            }
            
            if (typeof input === 'object' && input !== null && input instanceof this) {
                return Either.right(input as A & P);
            }
            return Either.map(decoder.decode(input), instance => new this(instance) as A & P);
        }
        
        constructor(instance : A) {
            Object.assign(this, instance);
        }
    }
    
    return Entity;
};

export const DecoderFrom = <A, E extends { new (instance : A) : A }>(decoder : D.Decoder<A>, EntityType : E) : E & D.Decoder<InstanceType<E>> => {
    return Object.assign(EntityType, {
        decode(input : unknown) {
            // FIXME
            return Either.map(decoder.decode(input), instance => new EntityType(instance) as InstanceType<E>);
        },
    });
};

export default Entity;
