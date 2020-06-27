
import { Either } from '../../../src/util/Either.js';

import * as D from '../../../src/modules/Decoding.js';
import Entity, { DecoderFrom } from './Entity.js';

import { User } from './User.js';


export type PostT = {
    title : string,
    author : User,
};
export const PostT : D.Decoder<PostT> = D.record({
    title: D.string,
    author: D.lazy(() => User),
});

interface PostC extends PostT {}
class PostC {
    constructor(post : PostT) {
        Object.assign(this, post);
    }
    
    render() {
        return `title: ${this.title}`;
    }
}

export const Post = DecoderFrom(PostT, PostC);
export type Post = InstanceType<typeof Post>;
