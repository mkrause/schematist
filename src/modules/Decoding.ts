
import $msg from 'message-tag';
import * as ObjectUtil from '../util/ObjectUtil.js';
import * as MapUtil from '../util/MapUtil.js';
import { Either } from '../util/Either.js';

import type { LocationKey, Location } from '../modules/Traversing.js';


//
// Reporting
//

const selfReport = Symbol('self');

export type DecodeError = { type : string };
export type DecodeReportChild = { given ?: unknown, report : DecodeReport };
export type DecodeReportChildren = Map<LocationKey | typeof selfReport, DecodeReportChild>;
export type DecodeReport =
    | DecodeError
    //| Array<DecodeError> // Note: if we need multiple errors, can just introduce a `type: '@multiple'` or something
    | DecodeReportChildren;
    // | Array<{ key : LocationKey, reason : DecodeReport }>;

export const fail : (report : DecodeReport) => Either<DecodeReport, never> = Either.left;
export const success : <A>(value : A) => Either<never, A> = Either.right;

// export const unexpectedTypeError = <U>(given : U) : DecodeError => ({ type: 'unexpected-type', given });
export const unexpectedTypeError = <U>() : DecodeError => ({ type: 'unexpected-type' });


//
// Decoder
//

export type DecodeResult<A> = Either<DecodeReport, A>;

export type Decoder<A> = {
    decode : (input : unknown) => Either<DecodeReport, A>,
};

export type TypeOf<D extends Decoder<unknown>> = D extends Decoder<infer A> ? A : never;


//
// Utilities
//

export type Tagged<T> = { tag : T };
export const isTagged = <T>(tag : T, input : unknown) : input is Tagged<T> => {
    return typeof input === 'object' && input !== null && ObjectUtil.hasOwnProp(input, 'tag') && input.tag === tag;
};

type NonEmptyArray<T> = [T, ...Array<T>];
type Traversable = { children : Map<LocationKey, Decoder<unknown>> };

type Unknown = Decoder<unknown>;
type DictOf<T> = { [key : string] : T };
type TypeOfDict<T extends { [key : string] : Decoder<unknown> }> = { [key in keyof T] : TypeOf<T[key]> };


//
// Basic constructors
//

export const unknown : Decoder<unknown> = {
    decode: (input : unknown) => success(input),
};

export const never : Decoder<never> = {
    decode: (input : unknown) => fail({ type: 'never' }),
};

export const unit : Decoder<null> = {
    decode: (input : unknown) => {
        if (input !== null) { return fail(unexpectedTypeError()); }
        return success(input);
    },
};

export const undef : Decoder<undefined> = {
    decode: (input : unknown) => {
        if (typeof input !== 'undefined') { return fail(unexpectedTypeError()); }
        return success(input);
    },
};

export const string : Decoder<string> = {
    decode: (input : unknown) => {
        if (typeof input !== 'string') { return fail(unexpectedTypeError()); }
        return success(input);
    },
};

export const number : Decoder<number> = {
    decode: (input : unknown) => {
        if (typeof input !== 'number') { return fail(unexpectedTypeError()); }
        return success(input);
    },
};

export const boolean : Decoder<boolean> = {
    decode: (input : unknown) => {
        if (typeof input !== 'boolean') { return fail(unexpectedTypeError()); }
        return success(input);
    },
};

export type Literal<L> = Decoder<L> & { tag : typeof literal, literal : L };
export const literal = <L>(lit : L) : Literal<L> => ({
    tag: literal,
    literal: lit,
    decode: (input : unknown) => {
        if (input !== lit) { return fail(unexpectedTypeError()); }
        return success(lit);
    },
});


//
// Unions
//

export type Union<S extends NonEmptyArray<Unknown>> = Decoder<TypeOf<S[number]>> & Traversable & {
    tag : typeof union,
};
export const unionErrors = {
    noneValid: (attempts : DecodeReportChildren) => ({ type: 'none-valid', attempts }),
};
export const union = <S extends NonEmptyArray<Unknown>>(alts : S) : Union<S> => {
    type Instance = TypeOf<S[number]>; // `S[number]` is the union of all elements (types) of the array `S`
    const decode = (input : unknown) => {
        let hasValid = false;
        let instance = null as unknown as Instance;
        const report : DecodeReportChildren = new Map();
        for (const key in alts) {
            const altIndex = Number(key);
            const alt = alts[altIndex];
            const result = alt.decode(input);
            
            if (Either.isRight(result)) {
                hasValid = true;
                instance = result.right as Instance;
                break;
            }
            
            report.set(altIndex, { report: result.left });
        }
        
        if (!hasValid) {
            return fail(unionErrors.noneValid(report));
        }
        
        return success(instance);
    };
    
    return {
        tag: union,
        get children() { return MapUtil.fromArray(alts) as Map<LocationKey, Decoder<unknown>>; },
        decode,
    };
};

// Note: `d` should be the first alternative, so that its decoding result is preferred in case both alts match
export const optional = <A>(d : Decoder<A>) => union([d, undef]);
export const maybe = <A>(d : Decoder<A>) => union([d, unit]);


//
// Complex constructors
//

export type Record<P extends DictOf<Unknown>> = Decoder<TypeOfDict<P>> & Traversable & {
    props : P,
    tag : typeof record,
};
export const recordErrors = {};
export const record = <P extends DictOf<Unknown>>(props : P) : Record<P> => {
    type Instance = TypeOfDict<P>;
    
    const decode = (input : unknown) => {
        if (typeof input !== 'object' || input === null) {
            return fail(unexpectedTypeError());
        }
        
        // Check whether the input is a plain object (reason: we construct a new object for the result,
        // so we would not want to "lose" the prototype)
        // XXX this fails across different contexts with different `Object` instances (e.g. frames or Node custom REPL)
        const proto = Object.getPrototypeOf(input);
        if (!(proto === null || proto === Object.prototype)) {
            return fail({ type: 'unexpected-prototype' });
        }
        
        const report : DecodeReportChildren = new Map();
        
        // Note: using `Object.keys()`, so nonenumerable keys and symbol keys are ignored
        // Symbol keys are preserved in the result, but not considered as record properties.
        const propsKeys = Object.keys(props);
        const inputKeys = Object.keys(input);
        
        // Check if the key sets are equal
        if (inputKeys.length !== propsKeys.length || !propsKeys.every(key => inputKeys.includes(key))) {
            const keysMissing = propsKeys.filter(key => !inputKeys.includes(key));
            const keysUnknown = inputKeys.filter(key => !propsKeys.includes(key));
            
            for (const key of keysMissing) {
                // Attempt to decode as undefined (if that succeeds, accept the property)
                const result = props[key].decode(undefined);
                if (Either.isLeft(result)) {
                    report.set(key, { report: { type: 'prop-missing' } });
                }
            }
            for (const key of keysUnknown) {
                report.set(key, { report: { type: 'prop-unknown' } });
            }
        }
        
        // Construct result object (respecting prototype and symbols)
        //const proto = Object.getPrototypeOf(input);
        const instance = (proto === null ? Object.create(null) : {}) as Instance;
        
        for (const symbolKey of Object.getOwnPropertySymbols(input)) {
            (instance as any)[symbolKey] = (input as any)[symbolKey];
        }
        
        // Check all props for validity
        for (const propKey in props) {
            if (!ObjectUtil.hasOwnProp(input, propKey)) {
                continue;
            }
            
            const propDecoder = props[propKey] as Decoder<TypeOf<P[typeof propKey]>>;
            const propInput = input[propKey];
            
            const propResult = propDecoder.decode(propInput);
            
            if (Either.isLeft(propResult)) {
                report.set(propKey, { report: propResult.left });
            } else {
                const propInstance = propResult.right;
                instance[propKey] = propInstance;
            }
        }
        
        if (report.size > 0) {
            return fail(report);
        }
        
        return success(instance);
    };
    
    return {
        tag: record,
        props,
        get children() { return MapUtil.fromObject(props) as Map<LocationKey, Decoder<P[string]>>; },
        decode,
    };
};

export const partial = <P extends DictOf<Unknown>>(rec : Record<P>) => {
    if (!isTagged(record, rec)) {
        throw new TypeError($msg`Partial expects a record as input, given ${rec}`);
    }
    
    const propsPartial = ObjectUtil.map(rec.props, <Q>(prop : Decoder<Q>) : Decoder<undefined | Q> => {
        if (isTagged(optional, prop)) {
            return prop;
        } else {
            return optional(prop);
        }
    });
    
    return record(propsPartial);
};


export type Dict<E extends Unknown> = Decoder<DictOf<E>> & Traversable & {
    entry : E,
    tag : typeof dict,
};
export const dictEntry = Symbol('dict.entry');
export const dict = <E extends Unknown>(entry : E) : Dict<E> => {
    type Instance = DictOf<E>;
    
    const decode = (input : unknown) => {
        if (typeof input !== 'object' || input === null) {
            return fail(unexpectedTypeError());
        }
        
        const report : DecodeReportChildren = new Map();
        
        const inputKeys = Object.keys(input);
        
        // Construct result object (respecting prototype and symbols)
        const proto = Object.getPrototypeOf(input);
        const instance = (proto === null ? Object.create(null) : {}) as Instance;
        
        for (const symbolKey of Object.getOwnPropertySymbols(input)) {
            (instance as any)[symbolKey] = (input as any)[symbolKey];
        }
        
        // Check all entries for validity
        for (const key in input) {
            const entryInput = (input as any)[key];
            
            const entryResult = entry.decode(entryInput);
            
            if (Either.isLeft(entryResult)) {
                report.set(key, { report: entryResult.left });
            } else {
                (instance as any)[key] = entryResult.right;
            }
        }
        
        if (report.size > 0) {
            return fail(report);
        }
        
        return success(instance);
    };
    
    return {
        tag: dict,
        entry,
        get children() {
            return new Map<LocationKey, E>([
                [dictEntry, entry],
            ]);
        },
        
        decode,
    };
};

export type Variant<S extends DictOf<Unknown>> = Decoder<TypeOfDict<S>[string]> & Traversable & {
    tag : typeof variant,
};
export const variantErrors = {
    noneValid: (attempts : DecodeReportChildren) => ({ type: 'none-valid', attempts }),
};
export const variant = <S extends DictOf<Unknown>>(alts : S) : Variant<S> => {
    type Instance = TypeOfDict<S>[string];
    
    const decode = (input : unknown) => {
        let hasValid = false;
        let instance = null as unknown as Instance;
        const report : DecodeReportChildren = new Map();
        for (const altKey in alts) {
            const alt = alts[altKey];
            const result = alt.decode(input);
            
            if (Either.isRight(result)) {
                hasValid = true;
                instance = { [altKey]: result.right } as Instance;
                break;
            }
            
            report.set(altKey, { report: result.left });
        }
        
        if (!hasValid) {
            return fail(variantErrors.noneValid(report));
        }
        
        return success(instance);
    };
    
    return {
        tag: variant,
        get children() { return MapUtil.fromObject(alts) as Map<LocationKey, S[string]>; },
        
        decode,
    };
};
