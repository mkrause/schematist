
import $msg from 'message-tag';
import * as ObjectUtil from '../util/ObjectUtil.js';
import * as MapUtil from '../util/MapUtil.js';
import { Either } from '../util/Either.js';

import type { LocationKey, Location } from '../modules/Traversing.js';

import * as D from './Decoding.js';


export const indexStep = Symbol('ref.index');

type PathStep = unknown | typeof indexStep;
type Path = Array<PathStep>;

export type Reference<P> = D.Decoder<Path> & { tag : typeof reference, path : Path };
export const reference = <P>(path : Path) : Reference<P> => {
    return {
        tag: reference,
        path,
        decode: (input : unknown) => {
            if (!Array.isArray(input)) {
                return D.fail({ type: 'unexpected-type' });
            }
            
            let failed = false;
            const instance = path.map((stepRef, index) => {
                if (!(index in input)) {
                    failed = true;
                    return;
                }
                
                const stepInput = input[index];
                
                if (stepRef === indexStep) {
                    return stepInput; // TODO
                } else {
                    if (stepRef !== stepInput) {
                        failed = true;
                        return;
                    }
                    return stepRef;
                }
            });
            
            if (failed) {
                return D.fail({ type: 'TODO' });
            }
            
            return D.success(instance);
        },
    };
};


const resolvePath = <P>(location : Location, path : Path) : Either<string, Location> => {
    if (path.length === 0) {
        return Either.right(location);
    }
    
    const [head, ...tail] = path;
    
    if (head === '..') {
        if (location.length === 0) {
            return Either.left($msg`Cannot take parent step of root`);
        }
        return resolvePath(location.slice(0, -1), tail);
    } else {
        return resolvePath([...location, head], tail);
    }
};

export const resolve = <A>(decoderRoot : D.Decoder<A>) => {
    let result;
    
    D.traverse(decoderRoot, (decoder, location) => {
        if (D.isTagged(reference, decoder)) {
            const ref = decoder as Reference<unknown>;
            // resolveRef(decoderRoot, decoder);
            
            const absoluteLocation = resolvePath(location, ref.path);
            
            console.log(location, absoluteLocation.right, decoder, D.locate(decoderRoot, absoluteLocation.right));
        }
    });
};




// https://www.npmjs.com/package/io-ts-path
// https://stackoverflow.com/questions/59658536/how-to-write-an-invert-type-in-typescript-to-invert-the-order-of-tuples
// https://dev.to/miracleblue/how-2-typescript-get-the-last-item-type-from-a-tuple-of-types-3fh3
