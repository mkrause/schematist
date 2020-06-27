
import { Either } from '../../../src/util/Either.js';

import * as D from '../../../src/modules/Decoding.js';
import Entity from './Entity.js';

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
export class Post extends Entity(PostT) {
    render() {
        return `title: ${this.title}`;
    }
}
