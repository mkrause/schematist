
import $msg from 'message-tag';

// Utilities
const hasOwnProp = <K extends PropertyKey>(obj : object, key : K): obj is { [key in K] : unknown } =>
    Object.prototype.hasOwnProperty.call(obj, key);
const isObject = (obj : unknown) : obj is { [key : string] : unknown } =>
    typeof obj === 'object' && obj !== null;

type Either<L, R> =
    | { left : L }
    | { right : R };

const Either = {
    left: <L>(left : L) : Either<L, never> => ({ left }),
    right: <R>(right: R): Either<never, R> => ({ right }),
    isLeft: <L>(either : Either<L, unknown>) : either is { left : L } => 'left' in either,
    isRight: <R>(either: Either<unknown, R>): either is { right : R } => 'right' in either,

    chain: <L1, R1, L2, R2>(either1 : Either<L1, R1>, fn : (right : R1) => Either<L2, R2>) : Either<L1 | L2, R2> => {
        if (Either.isLeft(either1)) {
            return either1;
        } else {
            return fn(either1.right);
        }
    },
    
    reportThrow: <L, R>(either : Either<L, R>) : R => {
        if (Either.isLeft(either)) { throw new Error(String(either.left)); }
        return either.right;
    },
};


// Decoding

type DecodeReport = string;
const fail = Either.left;
const success = Either.right;

type DecodeResult<A> = Either<DecodeReport, A>;

type DecodingContext = {};

interface Decoder<A, I = unknown> {
    parse : (input : I, context : DecodingContext) => DecodeResult<A>,
    decode : (input : I) => DecodeResult<A>,
}

const Decoder = <A, I>(decoder : Omit<Decoder<A, I>, 'decode'>) : Decoder<A, I> => ({
    decode: (input : I) => decoder.parse(input, {}),
    ...decoder,
});

type DecoderType<T extends Decoder<unknown>> = T extends Decoder<infer A> ? A : never;
type DecoderInput<T extends Decoder<unknown>> = T extends Decoder<unknown, infer I> ? I : never;

type Any = Decoder<unknown>;


// Encoding

//type Codec<A, I, O> = {};
//type Model<A, I, O> = Codec<A, I, O>;


// Constructors

const unit : Decoder<null> = Decoder({
    parse(input : unknown) {
        if (input !== null) { return fail($msg`Expected null, given ${input}`); }
        return success(input as null);
    },
});

const string : Decoder<string> & (<S extends string>(value: S) => Decoder<S>) = Object.assign(
    <S extends string>(value: S): Decoder<S> => Decoder({
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

const number : Decoder<number> = Decoder({
    parse(input) {
        if (typeof input !== 'number') { return fail($msg`Expected a number, given ${input}`); }
        return success(input);
    },
});

const Record : Decoder<{ [key : string] : unknown }> = Decoder({
    parse(input, context) {
        if (typeof input !== 'object' || input === null) { return fail(`Expected an object`); }
        const instance = input as { [key : string] : unknown };
        return success(instance);
    },
});

const record = <P extends { [key : string] : Any }>
    (props : P) : Decoder<{ [key in keyof P] : DecoderType<P[key]> }> => Decoder({
        parse(input : unknown, context : DecodingContext) {
            type Result = { [key in keyof P] : DecoderType<P[key]> };
            
            if (typeof input !== 'object' || input === null) { return fail($msg`Expected an object, given ${input}`); }
            
            let errors : string[] = [];
            for (const key in props) {
                if (!hasOwnProp(input, key)) {
                    errors.push(`Missing property: ${key}`);
                    continue;
                }

                const propSchema = props[key];
                const propInstance = input[key];
                const propResult = propSchema.parse(propInstance, {});
                if (Either.isLeft(propResult)) {
                    errors.push(`Invalid property '${key}': ${propResult.left}`);
                }
            }
            
            if (errors.length > 0) {
                return fail(errors.join(', '));
            }
            
            const instance = input as Result;
            return success(instance);
        },
    });

// const map = <K extends Any, V extends Any>
//     (key : K, value : V) : Decoder<any> => Decoder({
//         parse(input : unknown, context : DecodingContext) {
//             // TODO: parse as `Map`, also accept object *if* key extends string (or "simple type")
//         },
//     });

const dict = <E extends Any>
    (entry : E) : Decoder<{ [key : string] : E }> => Decoder({
        parse(input : unknown, context : DecodingContext) {
            if (!isObject(input)) { return fail($msg`Expected an object, given ${input}`); }

            const entrySchema = entry;

            let errors : string[] = [];
            for (const key in input) {
                const entryInstance = input[key];
                const entryResult = entrySchema.parse(entryInstance, {});
                if (Either.isLeft(entryResult)) {
                    errors.push(`Invalid entry '${key}': ${entryResult.left}`);
                }
            }
            
            if (errors.length > 0) {
                return fail(errors.join(', '));
            }
            
            const instance = input as { [key : string] : E };
            return success(instance);
        },
    });
