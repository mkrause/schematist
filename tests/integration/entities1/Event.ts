
import { Either } from '../../../src/util/Either.js';

import * as D from '../../../src/modules/Decoding.js';
import * as Entity from './Entity.js';


export const EventT = D.record({
    name: D.string,
});
export type EventT = D.TypeOf<typeof EventT>;

export interface Event extends EventT {}
@Entity.staticImplements<D.Decoder<Event>>()
export class Event {
    static decode(input : unknown) /* : Decoder<Event>['decode'] */ {
        if (typeof input === 'object' && input !== null && input instanceof Event) {
            return Either.right(input as Event);
        }
        return Either.map(EventT.decode(input), event => new Event(event));
    }
    
    constructor(event : EventT) {
        Object.assign(this, event);
    }
    
    formatName() {
        return `name: ${this.name}`;
    }
}
