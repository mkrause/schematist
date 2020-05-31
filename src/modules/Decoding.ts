
import $msg from 'message-tag';
import * as ObjectUtil from '../util/ObjectUtil.js';
import { Either } from '../util/Either.js';


//
// Reporting
//

export type DecodeReport = { type : string };

export const fail : (report : DecodeReport) => Either<DecodeReport, never> = Either.left;
export const success : <A>(value : A) => Either<never, A> = Either.right;


//
// Decoder
//

export type DecodeResult<A> = Either<DecodeReport, A>;

export type Decoder<A> = {
    decode : (input : unknown) => Either<DecodeReport, A>,
};

export type TypeOf<D> = D extends Decoder<infer A> ? A : never;


//
// Basic (nullary) constructors
//

export const unknown : Decoder<unknown> = {
    decode : (input : unknown) => success(input),
};

export const never : Decoder<never> = {
    decode : (input : unknown) => fail({ type: 'unexpected' }),
};

export const unit : Decoder<null> = {
    decode : (input : unknown) => {
        if (input !== null) {
            return fail({ type: 'unexpected-type', given: input });
        } else {
            return success(input);
        }
    },
};

export const undef : Decoder<undefined> = {
    decode : (input : unknown) => {
        if (typeof input !== 'undefined') {
            return fail({ type: 'unexpected-type', given: input });
        } else {
            return success(input);
        }
    },
};

export const string : Decoder<string> = {
    decode : (input : unknown) => {
        if (typeof input !== 'string') {
            return fail({ type: 'unexpected-type', given: input });
        } else {
            return success(input);
        }
    },
};

export const number : Decoder<number> = {
    decode : (input : unknown) => {
        if (typeof input !== 'number') {
            return fail({ type: 'unexpected-type', given: input });
        } else {
            return success(input);
        }
    },
};

export const boolean : Decoder<boolean> = {
    decode : (input : unknown) => {
        if (typeof input !== 'boolean') {
            return fail({ type: 'unexpected-type', given: input });
        } else {
            return success(input);
        }
    },
};


//
// Complex constructors
//

type Unknown = Decoder<unknown>;
type RecordOf<T> = Record<PropertyKey, T>;
type MapTypeOf<T> = { [key in keyof T] : TypeOf<T[key]> };

export type ReportRecord<P extends RecordOf<Unknown>> = DecodeReport & (
    | { type : 'unexpected-type', given : unknown }
    | { type : 'keys-mismatch', keysMissing : Array<keyof P>, keysUnknown : Array<keyof P> }
    | { type : 'props-invalid', invalidProps : { [prop in keyof P] ?: DecodeReport } }
);
export const record = <P extends RecordOf<Unknown>>(props : P) : Decoder<MapTypeOf<P>> => ({
    decode : (input : unknown) => {
        type Instance = MapTypeOf<P>;
        
        if (typeof input !== 'object' || input === null) {
            return fail({ type: 'unexpected-type', given: input } as ReportRecord<P>);
        }
        
        const propsKeys = Object.keys(props);
        const inputKeys = Object.keys(input);
        
        // Check if the key sets are equal
        if (inputKeys.length !== propsKeys.length || !propsKeys.every(key => inputKeys.includes(key))) {
            return fail({
                type: 'keys-mismatch',
                keysMissing: propsKeys.filter(key => !inputKeys.includes(key)),
                keysUnknown: inputKeys.filter(key => !propsKeys.includes(key)),
            } as ReportRecord<P>);
        }
        
        const inputWithKeys = input as { [key in keyof P] : unknown };
        
        // Check if all props are valid
        const instance = {} as Instance;
        const invalidProps : Record<PropertyKey, DecodeReport> = {};
        for (const propKey in props) {
            const propDecoder = props[propKey] as Decoder<TypeOf<P[typeof propKey]>>;
            const propInput = inputWithKeys[propKey];
            
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
            return fail({
                type: 'props-invalid',
                invalidProps,
            } as ReportRecord<P>);
        }
        
        return success(instance);
    },
});

// export const variant = <P extends RecordOf<Unknown>>(alts : P) : Decoder<MapTypeOf<P>> => ({
//     decode : (input : unknown) : input is MapTypeOf<P> => {
//         // TODO
//     },
// });
