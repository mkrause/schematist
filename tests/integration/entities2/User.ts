
import { Either } from '../../../src/util/Either.js';

import * as D from '../../../src/modules/Decoding.js';
import Entity from './Entity.js';

import { Post } from './Post.js';


export const UserT = D.record({
    name: D.string,
    posts: D.dict(D.string, Post),
});
export type UserT = D.TypeOf<typeof UserT>;


const test1 = Entity(UserT);
type Test = InstanceType<typeof test1>;

type UserMethods = {
    formatName() : string,
    test() : string,
};

export class User extends Entity<UserT, UserMethods>(UserT) implements UserMethods {
    formatName() {
        return `name: ${this.name}`;
    }
    
    test() {
        return this.formatName();
    }
}


type X = User['posts'];

const test = Either.orThrow(User.decode({}));
test.formatName();
test.test();
