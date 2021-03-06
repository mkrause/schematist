
import { Either } from '../../../src/util/Either.js';

import * as D from '../../../src/modules/Decoding.js';
import * as Entity from './Entity.js';

import { Post } from './Post.js';


export const UserT = D.record({
    name: D.string,
    posts: D.dict(D.string, Post),
});
export type UserT = D.TypeOf<typeof UserT>;


interface UserC extends UserT {};
class UserC {
    constructor(user : UserT) {
        Object.assign(this, user);
    }
    
    formatName() {
        return `name: ${this.name}`;
    }
    
    test() {
        return this.formatName();
    }
}

class User extends Entity.Base(UserT) {
    formatName() {
        return `name: ${this.name}`;
    }
    
    test() {
        return this.formatName();
    }
}
// type User = InstanceType<typeof User>;

const User_ = User as typeof User & {
    decode : (input : unknown) => Either<D.DecodeReport, UserT & User>,
};


// export const User = DecoderFrom(UserT, UserC);
// export type User = InstanceType<typeof User>;


const user1 = Either.orThrow(User_.decode({ name: 'John', posts: {} }));
user1.formatName();
user1.test();
