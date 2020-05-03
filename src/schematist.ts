
import $msg from 'message-tag';

import * as ObjectUtil from './util/ObjectUtil.js';
import { Either } from './util/Either.js';


//
// Decoding
//

export type DecodeReport = string;
export const fail = Either.left;
export const success = Either.right;

export type DecodeResult<A> = Either<DecodeReport, A>;

export const reportThrow = <A>(value : DecodeResult<A>) : A => {
    if (Either.isLeft(value)) { throw new TypeError(String(value.left)); }
    return value.right;
};

export type DecodingContext = {};

export type Decoder<A, I = unknown> = {
    _name : string,
    parse : (input : I, context : DecodingContext) => DecodeResult<A>,
    decode : (input : I) => DecodeResult<A>,
};

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
// Encoding
//

//type Codec<A, I, O> = {};
//type Model<A, I, O> = Codec<A, I, O>;


// Constructors

export const any = Decoder({
    _name: 'any',
    parse(input : unknown, context : DecodingContext) {
        return success(input);
    },
});

export const never = Decoder({
    _name: 'never',
    parse(input : unknown, context : DecodingContext) {
        return fail(`Unexpected`);
    },
});

export const undefinedC : Decoder<undefined> = Decoder({
    _name: 'undefined',
    parse(input : unknown, context : DecodingContext) {
        if (typeof input !== 'undefined') { return fail($msg`Expected undefined, given ${input}`); }
        return success(input as undefined);
    },
});

export const unit : Decoder<null> = Decoder({
    _name: 'unit',
    parse(input : unknown, context : DecodingContext) {
        if (input !== null) { return fail($msg`Expected null, given ${input}`); }
        return success(input as null);
    },
});

export const union = <S extends [Any, Any, ...Array<Any>]>(alts : S) : Decoder<S[number]> =>
    Decoder({
        _name: alts.map(alt => `\`${alt._name}\``).join(' | '),
        parse(input : unknown, context : DecodingContext) {
            type Result = S[number]; // `S[number]` gets the union of all array elements in `S`
            
            let isSuccess = false;
            for (const alt of alts) {
                const result = alt.decode(input);
                
                if (Either.isRight(result)) {
                    isSuccess = true;
                }
            }
            
            if (!isSuccess) {
                const altNames = alts.map(alt => `\`${alt._name}\``).join(' or ');
                return fail($msg`Expected one of ${$msg.raw(altNames)}, given ${input}`);
            }
            
            return success(input as Result);
        },
    });

export const optional = <A>(x : Decoder<A>) => union([undefinedC, x]);
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
        _name: 'record',
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


// Convenience utility for schemas

export type DefinitionApplication<T, A> = [(def : T) => Decoder<A>, T];
export type Definition =
    Decoder<unknown>
    | DefinitionApplication<unknown, unknown>
    | null
    | string
    | number
    //| bigint
    | { [key : string] : Definition };

type DecoderFromDefinition<D> =
    D extends Decoder<infer A, infer I> ? Decoder<A, I>
    : D extends DefinitionApplication<unknown, infer A> ? Decoder<A>
    : D extends null ? Decoder<D>
    : D extends string ? Decoder<D>
    : D extends number ? Decoder<D>
    : D extends { [key : string] : Definition }
        ? Decoder<{ [key in keyof D] : DecoderFromDefinition<D[key]> extends Decoder<infer A> ? A : never }>
    : never;

export const schema = <D extends Definition>(definition : D) : DecoderFromDefinition<D> => {
    if (isDecoder(definition)) {
        return definition as unknown as DecoderFromDefinition<D>;
    } else if (Array.isArray(definition) && definition.length === 2 && typeof definition[0] === 'function') {
        const [decoder, def] = definition;
        return decoder(schema(def)) as DecoderFromDefinition<D>;
    }
    
    if (typeof definition === 'undefined') {
        return undefinedC as DecoderFromDefinition<D>;
    } if (definition === null) {
        return unit as DecoderFromDefinition<D>;
    } else if (definition === true) {
        return any as DecoderFromDefinition<D>;
    } else if (definition === false) {
        return never as DecoderFromDefinition<D>;
    } else if (typeof definition === 'string') {
        return string(definition) as DecoderFromDefinition<D>;
    } else if (typeof definition === 'number') {
        return number(definition) as DecoderFromDefinition<D>;
    } else if (ObjectUtil.isPlainObject(definition)) {
        const props = definition as { [key : string] : Definition };
        return record(ObjectUtil.map(props, schema)) as DecoderFromDefinition<D>;
    } else {
        throw new TypeError($msg`Invalid schema definition, given ${definition}`);
    }
};
