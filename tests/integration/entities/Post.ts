
import { Either } from '../../../src/util/Either.js';

import * as D from '../../../src/modules/Decoding.js';
import * as Entity from '../../../src/modules/Entity.js';

import { User } from './User.js';


type PostT = {
    title : string,
    author : User,
};
const PostT : D.Decoder<PostT> = D.lazy(() => {
    return D.record({
        title: D.string,
        author: User,
    });
});

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
