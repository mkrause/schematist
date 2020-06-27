
import $msg from 'message-tag';
import { Either } from '../../../src/util/Either.js';

import * as D from '../../../src/modules/Decoding.js';


export const staticImplements = <T>() => {
    return <U extends T>(constructor : U) => constructor;
};


interface EntityType<A extends object, P extends A> extends D.Decoder<P> {
    schema : D.Decoder<A>,
    
    new (instance : A) : P,
};

export const Base = <A extends object>(schema : D.Decoder<A>) => {
    class Entity {
        static schema = schema;
        
        static decode<E extends EntityType<A, A>>(this : E, input : unknown) {
            type EntityInstance = InstanceType<E>;
            
            if (typeof this !== 'function' || !(this.prototype instanceof Entity)) {
                throw new TypeError($msg`decode() must be called on an Entity class, given ${this}`);
            }
            
            if (typeof input === 'object' && input !== null && input instanceof this) {
                return Either.right(input as EntityInstance);
            }
            
            return Either.map(schema.decode(input), instance => new this(instance) as EntityInstance);
        }
        
        constructor(instance : A) {
            Object.assign(this, instance);
        }
    }
    
    return Entity as EntityType<A, A>;
};



export const from = <A extends object, E extends { schema : D.Decoder<A>, new (instance : A) : unknown }>(Entity : E) => {
    //decoder : D.Decoder<A>
    return Entity as unknown as EntityType<A, A & InstanceType<E>>;
};
