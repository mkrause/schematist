
import $msg from 'message-tag';
import * as ObjectUtil from '../util/ObjectUtil.js';
import * as MapUtil from '../util/MapUtil.js';
import { Either } from '../util/Either.js';

import type { LocationKey, Location } from '../modules/Traversing.js';

import * as D from './Decoding.js';

//
// Codec
//

type Guard<A> = { is : (input : unknown) => input is A }; // TEMP
type Encoder<A, O> = { encode : (instance : A) => O }; // TEMP

export type Codec<A, O = unknown> = Guard<A> & D.Decoder<A> & Encoder<A, O>;

export type TypeOf<C extends Codec<unknown>> = C extends Codec<infer A> ? A : never;
export type OutputOf<C extends Codec<unknown>> = C extends Codec<unknown, infer O> ? O : never;


// Basic constructors

type LiteralMeta<L> = { tag : typeof literal, literal : L };
export const literal = <L>(lit : L) : Codec<L, L> & LiteralMeta<L> => {
    const decode = D.literal(lit).decode;
    
    return {
        tag: literal,
        literal: lit,
        
        is: (input : unknown) : input is L => Either.isRight(decode(input)),
        decode,
        encode: () => lit,
    };
};
