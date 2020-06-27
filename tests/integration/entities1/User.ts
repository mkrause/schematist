
import { Either } from '../../../src/util/Either.js';

import * as D from '../../../src/modules/Decoding.js';
import * as Entity from './Entity.js';

import { Post } from './Post.js';


export const UserT = D.record({
    name: D.string,
    posts: D.dict(D.string, Post),
});
export type UserT = D.TypeOf<typeof UserT>;

export interface User extends UserT {}
@Entity.staticImplements<D.Decoder<User>>()
export class User {
    static decode(input : unknown) /* : Decoder<User>['decode'] */ {
        if (typeof input === 'object' && input !== null && input instanceof User) {
            return Either.right(input as User);
        }
        return Either.map(UserT.decode(input), user => new User(user));
    }
    
    constructor(user : UserT) {
        Object.assign(this, user);
    }
    
    formatName() {
        return `name: ${this.name}`;
    }
}

const user1 = Either.orThrow(User.decode({
    name: 'Bob',
    posts: {},
}));

const result1 : string = user1.formatName();
