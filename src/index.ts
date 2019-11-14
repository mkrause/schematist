
import $msg from 'message-tag';

import * as ObjectUtil from './util/ObjectUtil.js';
import { Either } from './util/Either.js';


// Decoding

export type DecodeReport = string;
export const fail = Either.left;
export const success = Either.right;

export type DecodeResult<A> = Either<DecodeReport, A>;

export const reportThrow = <A>(value : DecodeResult<A>) : A => {
    if (Either.isLeft(value)) { throw new Error(String(value.left)); }
    return value.right;
};

export type DecodingContext = {};

export interface Decoder<A, I = unknown> {
    parse : (input : I, context : DecodingContext) => DecodeResult<A>,
    decode : (input : I) => DecodeResult<A>,
}

export const Decoder = <A, I>(decoder : Omit<Decoder<A, I>, 'decode'>) : Decoder<A, I> => ({
    decode: (input : I) => decoder.parse(input, {}),
    ...decoder,
});

export type DecoderType<T extends Decoder<unknown>> = T extends Decoder<infer A> ? A : never;
export type DecoderInput<T extends Decoder<unknown>> = T extends Decoder<unknown, infer I> ? I : never;

export type Any = Decoder<unknown>;


// Encoding

//type Codec<A, I, O> = {};
//type Model<A, I, O> = Codec<A, I, O>;


// Constructors

export const any = Decoder({
    parse(input : unknown) {
        return success(input);
    },
});

export const never = Decoder({
    parse(input : unknown) {
        return fail(`Unexpected`);
    },
});

export const unit : Decoder<null> = Decoder({
    parse(input : unknown) {
        if (input !== null) { return fail($msg`Expected null, given ${input}`); }
        return success(input as null);
    },
});
2
export const string : Decoder<string> & (<S extends string>(value : S) => Decoder<S>) = Object.assign(
    <S extends string>(value : S) : Decoder<S> => Decoder({
        parse(input : unknown) {
            if (typeof input !== 'string') { return fail($msg`Expected a string, given ${input}`); }
            if (input !== value) { return fail(`Expected the string ${value}`); }
            return success(input as S);
        },
    }), Decoder({
        parse(input : unknown) {
            if (typeof input !== 'string') { return fail($msg`Expected a string, given ${input}`); }
            return success(input);
        },
    })
);

export const number : Decoder<number> & (<N extends number>(value : N) => Decoder<N>) = Object.assign(
    <N extends number>(value : N) : Decoder<N> => Decoder({
        parse(input : unknown) {
            if (typeof input !== 'number') { return fail($msg`Expected a number, given ${input}`); }
            if (input !== value) { return fail(`Expected the number ${value}`); }
            return success(input as N);
        },
    }), Decoder({
        parse(input : unknown) {
            if (typeof input !== 'number') { return fail($msg`Expected a number, given ${input}`); }
            return success(input);
        },
    })
);

export const Dict : Decoder<{ [key : string] : unknown }> = Decoder({
    parse(input, context) {
        if (typeof input !== 'object' || input === null) { return fail(`Expected an object`); }
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
        parse(input : unknown, context : DecodingContext) {
            type Result = { [key in keyof P] : DecoderType<P[key]> };
            
            if (typeof input !== 'object' || input === null) {
                return fail($msg`Expected an object, given ${input}`);
            }
            
            const instance = {} as Result;
            let errors : string[] = [];
            for (const key in props) {
                if (!ObjectUtil.hasOwnProp(input, key)) {
                    errors.push(`Missing property: ${key}`);
                    continue;
                }
                
                const propSchema = props[key];
                const propInstance = input[key];
                const propResult = propSchema.parse(propInstance, {});
                if (Either.isLeft(propResult)) {
                    errors.push(`Invalid property '${key}': ${propResult.left}`);
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

// export const map = <K extends Any, V extends Any>
//     (key : K, value : V) : Decoder<any> => Decoder({
//         parse(input : unknown, context : DecodingContext) {
//             // TODO: parse as `Map`, also accept object *if* key extends string (or "simple type")
//         },
//     });

export const dict = <E extends Any>(entry : E)
    : Decoder<{ [key : string] : E }> =>
    Decoder({
        parse(input : unknown, context : DecodingContext) {
            type Result = { [key : string] : E };
            
            if (!ObjectUtil.isObject(input)) { return fail($msg`Expected an object, given ${input}`); }
            
            const entrySchema = entry;
            
            const instance : Result = {};
            let errors : string[] = [];
            for (const key in input) {
                const entryInstance = input[key];
                const entryResult = entrySchema.parse(entryInstance, {});
                if (Either.isLeft(entryResult)) {
                    errors.push(`Invalid entry '${key}': ${entryResult.left}`);
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

// Utility to create codecs
export type Definition =
    Decoder<unknown>
    | null 
    | string 
    | number 
    //| bigint 
    | { [key : string] : Definition };

type DecoderFromDefinition<D> =
    D extends Decoder<infer A> ? Decoder<A>
    : D extends null ? Decoder<D>
    : D extends string ? Decoder<D>
    : D extends number ? Decoder<D>
    : D extends { [key : string] : Definition }
    ? Decoder<{ [key in keyof D] : DecoderFromDefinition<D[key]> extends Decoder<infer A> ? A : never }>
    : never;

export const schema = <D extends Definition>(definition : D) : DecoderFromDefinition<D> => {
    if (definition === null) {
        return unit as DecoderFromDefinition<D>;
    } else if (typeof definition === 'string') {
        return string(definition) as DecoderFromDefinition<D>;
    } else if (typeof definition === 'number') {
        return number(definition) as DecoderFromDefinition<D>;
    } else if (ObjectUtil.isObject(definition)) {
        const props = definition as { [key : string] : Definition };
        return record(ObjectUtil.map(props, schema)) as DecoderFromDefinition<D>;
    } else {
        throw new TypeError($msg`Invalid schema definition, given ${definition}`);
    }
};

const App = schema({ name: { z: string, x: 42 as const } });
