
import { Either } from '../../../src/util/Either.js';

import * as D from '../../../src/modules/Decoding.js';
import * as Entity from '../../../src/modules/Entity.js';


const EventT = D.record({
    name: D.string,
});
type EventT = D.TypeOf<typeof EventT>;

export interface Event extends EventT {}
@Entity.staticImplements<D.Decoder<Event>>()
export class Event {
    static decode(input : unknown) /* : Decoder<Event>['decode'] */ {
        if (typeof input === 'object' && input !== null && input instanceof Event) {
            return Either.right(input as Event);
        }
        return Either.map(EventT.decode(input), user => new Event(user));
    }
    
    constructor(user : EventT) {
        Object.assign(this, user);
    }
    
    formatName() {
        return `name: ${this.name}`;
    }
}
