
import { Either } from '../../../src/util/Either.js';

import * as D from '../../../src/modules/Decoding.js';
import * as Entity from '../../../src/modules/Entity.js';

import { User } from './User.js';


// export type PostT = {
//     title : string,
//     author : User,
// };
const Author : D.Decoder<User> = D.lazy(() => User);
export const PostT /* : D.Decoder<PostT> */ = D.record({
    title: D.string,
    author: Author,
});
export type PostT = D.TypeOf<typeof PostT>;

export interface Post extends PostT {}
@Entity.staticImplements<D.Decoder<Post>>()
export class Post {
    static decode(input : unknown) /* : Decoder<Post>['decode'] */ {
        if (typeof input === 'object' && input !== null && input instanceof Post) {
            return Either.right(input as Post);
        }
        return Either.map(PostT.decode(input), post => new Post(post));
    }
    
    constructor(post : PostT) {
        Object.assign(this, post);
    }
    
    render() {
        return `title: ${this.title}`;
    }
}
