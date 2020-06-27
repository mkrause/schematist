
import { Either } from '../../../src/util/Either.js';

import * as D from '../../../src/modules/Decoding.js';
import Entity from './Entity.js';


/*
export const EventT = D.record({
    name: D.string,
});
export type EventT = D.TypeOf<typeof EventT>;


class Event {
    formatName() {
        return `name: ${this.name}`;
    }
    
    test() {
        return this.formatName();
    }
}


const test = Either.orThrow(Event.decode({}));
test.formatName();
test.test();
*/
