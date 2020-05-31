
import $msg from 'message-tag';

import * as ObjectUtil from '../util/ObjectUtil.js';
import { Either } from '../util/Either.js';


type Key = PropertyKey;


// Context

export type DecodingContext = {};


// Reporting

export type DecodeReport = string | { type : string };
export const fail = Either.left;
export const success = Either.right;

export type DecodeResult<A> = Either<DecodeReport, A>;

export const reportThrow = <A>(value : DecodeResult<A>) : A => {
    if (Either.isLeft(value)) { throw new TypeError(String(value.left)); }
    return value.right;
};



export type Decoder<A, I = unknown> = {
    keys : null | Set<Key>,
    parse : (input : I, context : DecodingContext) => DecodeResult<A>,
    decode : (input : I) => DecodeResult<A>,
};


// Note: returning `Decoder<unknown, unknown>` is the best we can do here, because we cannot determine
// the type of a function at runtime. If we try to be clever with a generic `value : T`, then TypeScript
// will fail with a "not assignable to parameter" error.
export const isDecoder = (value : unknown) : value is Decoder<unknown, unknown> => {
    if (typeof value === 'undefined' || !ObjectUtil.isObject(value)) {
        return false;
    }
    
    if (ObjectUtil.hasProp(value, 'parse') && typeof value.parse === 'function'
        && ObjectUtil.hasProp(value, 'decode') && typeof value.decode === 'function'
    ) {
        return true;
    } else {
        return false;
    }
};

export const Decoder = <A, I>(decoder : Omit<Decoder<A, I>, 'decode'>) : Decoder<A, I> => ({
    decode: (input : I) => decoder.parse(input, {}),
    ...decoder,
});

export type DecoderType<T extends Decoder<unknown>> = T extends Decoder<infer A> ? A : never;
export type DecoderInput<T extends Decoder<unknown>> = T extends Decoder<unknown, infer I> ? I : never;

// Decoder types
export type Any = Decoder<unknown>;


//
// Constructors
//

export const any : Decoder<unknown> = Decoder({
    //_name: 'any',
    props: null,
    parse(input : unknown, context : DecodingContext) {
        return success(input);
    },
});


const neverErrors = { unexpected: null };
export const never : Decoder<never> & { errors: typeof neverErrors } = Object.assign(
    Decoder({
        //_name: 'never',
        props: null,
        parse(input : unknown, context : DecodingContext) {
            return fail({ type: 'unexpected' }) as DecodeResult<never>;
        },
    }),
    { errors: neverErrors },
);


export const undefinedD : Decoder<undefined> = Decoder({
    //_name: 'undefined',
    props: null,
    parse(input : unknown, context : DecodingContext) {
        if (typeof input !== 'undefined') {
            //return fail($msg`Expected undefined, given ${input}`);
            return fail({ type: 'invalidType', expected: 'undefined' });
        }
        return success(input as undefined);
    },
});


export const unit : Decoder<null> = Decoder({
    //_name: 'unit',
    props: null,
    parse(input : unknown, context : DecodingContext) {
        if (input !== null) {
            //return fail($msg`Expected null, given ${input}`);
            return fail({ type: 'invalidType', expected: 'null' });
        }
        return success(input as null);
    },
});


const unionErrors = {
    noneValid: ({ keys } : { keys : Set<Key> }) => ({ type: 'noneValid' }),
};
export const union = <S extends [Any, Any, ...Array<Any>]>(alts : S) : Decoder<S[number]> => {
    const keys = new Set(alts.keys());
    
    return Object.assign(
        Decoder({
            props: alts,
            parse(input : unknown, context : DecodingContext) {
                type Result = S[number]; // `S[number]` gets the union of all array elements in `S`
                
                const childContext = { parent: this };
                
                let hasValid = false;
                const results = alts.map(alt => {
                    const result = alt.parse(input, childContext);
                    
                    if (Either.isRight(result)) {
                        hasValid = true;
                    }
                    
                    return result;
                });
                
                if (!hasValid) {
                    //const altNames = alts.map(alt => `\`${alt._name}\``).join(' or ');
                    //return fail($msg`Expected one of ${$msg.raw(altNames)}, given ${input}`);
                    
                    return fail({ type: 'noneValid' });
                }
                
                return success(input as Result);
            },
        }),
        {
            format: () => ({ type: 'template', tag: 'union', template: [alts.map(alt => ' | ').slice(0, -1), alts] }),
            errors: unionErrors,
        },
    );
};

export const optional = <A>(x : Decoder<A>) => union([undefinedD, x]);
export const maybe = <A>(x : Decoder<A>) => union([unit, x]);

export const string : Decoder<string> & (<S extends string>(value : S) => Decoder<S>) = Object.assign(
    <S extends string>(value : S) : Decoder<S> => Decoder({
        _name: value,
        parse(input : unknown) {
            if (typeof input !== 'string') { return fail($msg`Expected a string, given ${input}`); }
            if (input !== value) { return fail($msg`Expected the string ${value}, given ${input}`); }
            return success(input as S);
        },
    }), Decoder({
        _name: 'string',
        parse(input : unknown) {
            if (typeof input !== 'string') { return fail($msg`Expected a string, given ${input}`); }
            return success(input);
        },
    }),
);

export const number : Decoder<number> & (<N extends number>(value : N) => Decoder<N>) = Object.assign(
    <N extends number>(value : N) : Decoder<N> => Decoder({
        _name: String(value),
        parse(input : unknown) {
            if (typeof input !== 'number') { return fail($msg`Expected a number, given ${input}`); }
            if (input !== value) { return fail($msg`Expected the number ${value}, given ${input}`); }
            return success(input as N);
        },
    }), Decoder({
        _name: 'number',
        parse(input : unknown) {
            if (typeof input !== 'number') { return fail($msg`Expected a number, given ${input}`); }
            return success(input);
        },
    }),
);

export const Dict : Decoder<{ [key : string] : unknown }> = Decoder({
    _name: 'Dict',
    parse(input, context) {
        if (typeof input !== 'object' || input === null) { return fail($msg`Expected an object`); }
        const instance = input as { [key : string] : unknown };
        return success(instance);
    },
});

// export const Record = {
//     parse(input, context) {
//         if (typeof input !== 'object' || input === null) { return left('Expected an object'); }
//         return right(new Map(Object.entries(input)));
//     },
// };

export const record = <P extends { [key : string] : Any }>(props : P)
    : Decoder<{ [key in keyof P] : DecoderType<P[key]> }> =>
    Decoder({
        _name: 'record', // TODO
        parse(input : unknown, context : DecodingContext) {
            type Result = { [key in keyof P] : DecoderType<P[key]> };
            
            if (typeof input !== 'object' || input === null) {
                return fail($msg`Expected a record, given ${input}`);
            }
            
            const instance = {} as Result;
            let errors : string[] = [];
            for (const key in props) {
                // if (!ObjectUtil.hasOwnProp(input, key)) {
                //     errors.push(`Missing property: ${key}`);
                //     continue;
                // }
                
                const propSchema = props[key];
                const propInstance = ObjectUtil.hasOwnProp(input, key) ? input[key] : undefined;
                const propResult = propSchema.parse(propInstance, {});
                if (Either.isLeft(propResult)) {
                    if (!ObjectUtil.hasOwnProp(input, key)) {
                        errors.push($msg`Missing property: ${key}`);
                    } else {
                        errors.push($msg`Invalid property ${key}: ${$msg.raw(propResult.left)}`);
                    }
                } else {
                    instance[key] = propResult.right as DecoderType<typeof propSchema>;
                }
            }
            
            if (errors.length > 0) {
                return fail(errors.join(', '));
            }
            
            return success(instance);
        },
    });


type EntriesOf<T, K> = K extends keyof T ? { [key in K] : T[K] } : never;

export const option = <S extends { [key : string] : Any }>(alts : S)
    : Decoder<EntriesOf<S, keyof S>> =>
    Decoder({
        _name: 'option', // TODO
        parse(input : unknown, context : DecodingContext) {
            type Result = EntriesOf<S, keyof S>;
            
            if (!ObjectUtil.isPlainObject(input)) {
                return fail($msg`Expected a plain object, given ${input}`);
            }
            
            const altKeys = Object.keys(alts);
            const inputKeys = Object.keys(input);
            
            if (inputKeys.length !== 1) {
                return fail($msg`Expected a plain object with a single key, given ${input}`);
            }
            
            const choiceKey = inputKeys[0];
            if (!altKeys.includes(choiceKey)) {
                return fail($msg`Expected one of ${altKeys}, given ${choiceKey}`);
            }
            
            const choice = input[choiceKey];
            const alt = alts[choiceKey];
            
            const choiceResult = alt.parse(choice, {});
            
            if (Either.isLeft(choiceResult)) {
                return fail($msg`Invalid option ${choiceKey}: ${choiceResult.left}`);
            } else {
                return success({ [choiceKey]: choiceResult.right } as Result);
            }
        },
    });


// export const map = <K extends Any, V extends Any>
//     (key : K, value : V) : Decoder<any> => Decoder({
//         parse(input : unknown, context : DecodingContext) {
//             // TODO: parse as `Map`, also accept object *if* key extends string (or "simple type")
//         },
//     });

export const dict = <E extends Any>(entry : E)
    : Decoder<{ [key : string] : E }> =>
    Decoder({
        _name: 'dict',
        parse(input : unknown, context : DecodingContext) {
            type Result = { [key : string] : E };
            
            if (!ObjectUtil.isObject(input)) { return fail($msg`Expected a dict, given ${input}`); }
            
            const entrySchema = entry;
            
            const instance : Result = {};
            let errors : string[] = [];
            for (const key in input) {
                const entryInstance = input[key];
                const entryResult = entrySchema.parse(entryInstance, {});
                if (Either.isLeft(entryResult)) {
                    errors.push($msg`Invalid entry ${key}: ${$msg.raw(entryResult.left)}`);
                } else {
                    instance[key] = entryResult.right as E;
                }
            }
            
            if (errors.length > 0) {
                return fail(errors.join(', '));
            }
            
            return success(instance);
        },
    });
