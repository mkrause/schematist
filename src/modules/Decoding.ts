
import $msg from 'message-tag';
import * as ObjectUtil from '../util/ObjectUtil.js';
import { Either } from '../util/Either.js';


type LocationKey = unknown;


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
// Complex constructors
//

type Tag = { tag : unknown };

type Unknown = Decoder<unknown>;
type RecordOf<T> = Record<PropertyKey, T>;
type MapTypeOf<T> = { [key in keyof T] : TypeOf<T[key]> };


export const record = <P extends RecordOf<Unknown>>(props : P) : Decoder<MapTypeOf<P>> & Tag => ({
    tag: record,
    decode: (input : unknown) => {
        type Instance = MapTypeOf<P>;
        
        if (typeof input !== 'object' || input === null) {
            return fail(unexpectedTypeError(input));
        }
        
        const report : DecodeReport = [];
        
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
        
        // Check if all props are valid
        const instance = {} as Instance;
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
    },
});

// export const variant = <P extends RecordOf<Unknown>>(alts : P) : Decoder<MapTypeOf<P>> => ({
//     decode: (input : unknown) : input is MapTypeOf<P> => {
//         // TODO
//     },
// });
