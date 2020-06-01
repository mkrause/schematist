
import $msg from 'message-tag';
import * as ObjectUtil from '../util/ObjectUtil.js';
import * as MapUtil from '../util/MapUtil.js';
import { Either } from '../util/Either.js';

import type { LocationKey, Location } from '../modules/Traversing.js';


//
// Reporting
//

export type DecodeError = { type : string, given ?: unknown };
export type DecodeReport = DecodeError | Array<{ key : LocationKey, reason : DecodeReport }>;

export const fail : (report : DecodeReport) => Either<DecodeReport, never> = Either.left;
export const success : <A>(value : A) => Either<never, A> = Either.right;

export const unexpectedTypeError = <U>(given : U) : DecodeError => ({ type: 'unexpected-type', given });


//
// Decoder
//

export type DecodeResult<A> = Either<DecodeReport, A>;

export type Decoder<A> = {
    decode: (input : unknown) => Either<DecodeReport, A>,
};

export type TypeOf<D> = D extends Decoder<infer A> ? A : never;


//
// Utilities
//

type NonEmptyArray<T> = [T, ...Array<T>];
type Traversable = { children : Map<LocationKey, Decoder<unknown>> };

type Unknown = Decoder<unknown>;
type RecordOf<T> = Record<PropertyKey, T>;
type MapTypeOf<T> = { [key in keyof T] : TypeOf<T[key]> };


//
// Basic (nullary) constructors
//

export const unknown : Decoder<unknown> = {
    decode: (input : unknown) => success(input),
};

export const neverError = { type: 'never' };
export const never : Decoder<never> = {
    decode: (input : unknown) => fail(neverError),
};

export const unit : Decoder<null> = {
    decode: (input : unknown) => {
        if (input !== null) { return fail(unexpectedTypeError(input)); }
        return success(input);
    },
};

export const undef : Decoder<undefined> = {
    decode: (input : unknown) => {
        if (typeof input !== 'undefined') { return fail(unexpectedTypeError(input)); }
        return success(input);
    },
};

export const string : Decoder<string> = {
    decode: (input : unknown) => {
        if (typeof input !== 'string') { return fail(unexpectedTypeError(input)); }
        return success(input);
    },
};

export const number : Decoder<number> = {
    decode: (input : unknown) => {
        if (typeof input !== 'number') { return fail(unexpectedTypeError(input)); }
        return success(input);
    },
};

export const boolean : Decoder<boolean> = {
    decode: (input : unknown) => {
        if (typeof input !== 'boolean') { return fail(unexpectedTypeError(input)); }
        return success(input);
    },
};


//
// Unions
//

type UnionMeta<S extends NonEmptyArray<Unknown>> = {
    decode : Decoder<S[number]>['decode'] & Traversable & {
        tag : typeof union,
    },
};
export const union = <S extends NonEmptyArray<Unknown>>(alts : S) : Decoder<S[number]> & UnionMeta<S> => {
    const decode = (input : unknown) => {
        type Instance = S[number]; // `S[number]` is the union of all elements (types) of the array `S`
        
        let hasValid = false;
        let instance = null as unknown as Instance;
        const reports = new Map();
        for (const key in alts) {
            const altIndex = Number(key);
            const alt = alts[altIndex];
            const result = alt.decode(input);
            
            if (Either.isRight(result)) {
                hasValid = true;
                instance = result.right as Instance;
                break;
            }
            
            reports.set(altIndex, result.left);
        }
        
        if (!hasValid) {
            return fail({ type: 'none-valid', reports });
        }
        
        return success(instance);
    };
    
    return {
        decode: Object.assign(decode, {
            tag: union,
            children: MapUtil.fromArray(alts) as Map<LocationKey, Decoder<unknown>>,
        }),
    };
};

// Note: `d` should be the first alternative, so that its decoding result is preferred in case both alts match
export const optional = <A>(d : Decoder<A>) => union([d, undef]);
export const maybe = <A>(d : Decoder<A>) => union([d, unit]);


//
// Complex constructors
//

type RecordMeta<P extends RecordOf<Unknown>> = {
    decode : Decoder<MapTypeOf<P>>['decode'] & Traversable & {
        tag : typeof record,
    },
};
export const record = <P extends RecordOf<Unknown>>(props : P) : Decoder<MapTypeOf<P>> & RecordMeta<P> => {
    const decode = (input : unknown) => {
        type Instance = MapTypeOf<P>;
        
        if (typeof input !== 'object' || input === null) {
            return fail(unexpectedTypeError(input));
        }
        
        // Check whether the input is a plain object (reason: we construct a new object for the result,
        // so we would not want to "lose" the prototype)
        // XXX this fails across different contexts with different `Object` instances (e.g. frames or Node custom REPL)
        // const proto = Object.getPrototypeOf(input);
        // if (!(proto === null || proto === Object.prototype)) {
        //     return fail({ type: 'unexpected-prototype', given: proto });
        // }
        
        const report : DecodeReport = [];
        
        // Note: using `Object.keys()`, so nonenumerable keys and symbol keys are ignored
        // Symbol keys are preserved in the result, but not considered as record properties.
        const propsKeys = Object.keys(props);
        const inputKeys = Object.keys(input);
        
        // Check if the key sets are equal
        if (inputKeys.length !== propsKeys.length || !propsKeys.every(key => inputKeys.includes(key))) {
            const keysMissing = propsKeys.filter(key => !inputKeys.includes(key));
            const keysUnknown = inputKeys.filter(key => !propsKeys.includes(key));
            
            for (const key of keysMissing) {
                report.push({ key, reason: { type: 'prop-missing' } });
            }
            for (const key of keysUnknown) {
                report.push({ key, reason: { type: 'prop-unknown' } });
            }
        }
        
        // Construct result object (respecting prototype and symbols)
        const proto = Object.getPrototypeOf(input);
        const instance = (proto === null ? Object.create(null) : {}) as Instance;
        
        for (const symbolKey of Object.getOwnPropertySymbols(input)) {
            (instance as any)[symbolKey] = (input as any)[symbolKey];
        }
        
        // Check all props for validity
        const invalidProps : Record<PropertyKey, DecodeReport> = {};
        for (const propKey in props) {
            if (!ObjectUtil.hasOwnProp(input, propKey)) {
                continue;
            }
            
            const propDecoder = props[propKey] as Decoder<TypeOf<P[typeof propKey]>>;
            const propInput = input[propKey];
            
            const propResult = propDecoder.decode(propInput);
            
            if (Either.isLeft(propResult)) {
                const report = propResult.left;
                invalidProps[propKey] = report;
            } else {
                const propInstance = propResult.right;
                instance[propKey] = propInstance;
            }
        }
        
        if (Object.keys(invalidProps).length > 0) {
            for (const [key, reason] of Object.entries(invalidProps)) {
                report.push({ key, reason });
            }
        }
        
        if (report.length > 0) {
            return fail(report);
        }
        
        return success(instance);
    };
    
    return {
        decode: Object.assign(decode, {
            tag: record,
            children: MapUtil.fromObject(props) as Map<LocationKey, Decoder<unknown>>,
        }),
    };
};

// export const variant = <P extends RecordOf<Unknown>>(alts : P) : Decoder<MapTypeOf<P>> => ({
//     decode: (input : unknown) : input is MapTypeOf<P> => {
//         // TODO
//     },
// });
