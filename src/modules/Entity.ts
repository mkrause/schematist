
import $msg from 'message-tag';
import * as ObjectUtil from '../util/ObjectUtil.js';
import * as MapUtil from '../util/MapUtil.js';
import { Either } from '../util/Either.js';

import type { LocationKey, Location } from './Traversing.js';
import * as D from './Decoding.js';


// https://github.com/Microsoft/TypeScript/issues/5326


export const staticImplements = <T>() => {
    return <U extends T>(constructor : U) => constructor;
};




// Attempt 1

const EventT = D.record({
    name: D.string,
});
type EventT = D.TypeOf<typeof EventT>;

export interface Event extends EventT {}
@staticImplements<D.Decoder<Event>>()
export class Event {
    static decode(input : unknown) /* : Decoder<Event>['decode'] */ {
        return Either.map(EventT.decode(input), user => new Event(user));
    }
    
    constructor(user : EventT) {
        Object.assign(this, user);
    }
    
    formatName() {
        return `name: ${this.name}`;
    }
}


//const _ : Decoder<Event> = Event;

//const user = Either.orThrow(Event.decode({}));
// const xxx = { ...user };





/*
// Attempt 2

const EntityUtil = <A, C extends { new (instance : A) : A } /*& Decoder<A>* />(
        decoder : D.Decoder<A>,
        EntityClass : C,
    ) => ({
        test: null as unknown as [A, C, InstanceType<C>],
        decode(input : unknown) {
            return Either.map(decoder.decode(input), result => new EntityClass(result) as InstanceType<C>);
        },
        construct(classInstance : InstanceType<C>, codecInstance : A) {
            Object.assign(classInstance, codecInstance);
        },
    });

const withEntityUtil = <A>(decoder : D.Decoder<A>) =>
    <C extends { new (instance : A) : A } /*& D.Decoder<A>* />(constructor : C) => {
        const entityUtil = EntityUtil(decoder, constructor);
        
        const EntityClass = constructor as C & D.Decoder<InstanceType<C>>;
        EntityClass.decode = entityUtil.decode;
        return EntityClass;
    };

export interface User extends UserT {}
// @withEntityUtil(UserT)
@staticImplements<D.Decoder<User>>()
export class User {
    static _util = EntityUtil(UserT, User);
    static decode(input : unknown) { return this._util.decode(input); }
    
    constructor(user : UserT) {
        Object.assign(this, user);
        // User._util.construct(this, user);
    }
    
    formatName() {
        return `name: ${this.name}`;
    }
}

const test = User.decode;


//const entityFrom = <T>(entityClass : T)
*/
