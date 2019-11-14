import { Either } from './util/Either.js';
export declare type DecodeReport = string;
export declare const fail: <L>(left: L) => {
    left: L;
};
export declare const success: <R>(right: R) => {
    right: R;
};
export declare type DecodeResult<A> = Either<DecodeReport, A>;
export declare const reportThrow: <A>(value: Either<string, A>) => A;
export declare type DecodingContext = {};
export interface Decoder<A, I = unknown> {
    parse: (input: I, context: DecodingContext) => DecodeResult<A>;
    decode: (input: I) => DecodeResult<A>;
}
export declare const Decoder: <A, I>(decoder: Pick<Decoder<A, I>, "parse">) => Decoder<A, I>;
export declare type DecoderType<T extends Decoder<unknown>> = T extends Decoder<infer A> ? A : never;
export declare type DecoderInput<T extends Decoder<unknown>> = T extends Decoder<unknown, infer I> ? I : never;
export declare type Any = Decoder<unknown>;
export declare const any: Decoder<unknown, unknown>;
export declare const never: Decoder<unknown, unknown>;
export declare const unit: Decoder<null>;
export declare const string: Decoder<string> & (<S extends string>(value: S) => Decoder<S>);
export declare const number: Decoder<number> & (<N extends number>(value: N) => Decoder<N>);
export declare const Dict: Decoder<{
    [key: string]: unknown;
}>;
export declare const record: <P extends {
    [key: string]: Any;
}>(props: P) => Decoder<{ [key in keyof P]: DecoderType<P[key]>; }, unknown>;
export declare const dict: <E extends Any>(entry: E) => Decoder<{
    [key: string]: E;
}, unknown>;
export declare type Definition = Decoder<unknown> | null | string | number | {
    [key: string]: Definition;
};
declare type DecoderFromDefinition<D> = D extends Decoder<infer A> ? Decoder<A> : D extends null ? Decoder<D> : D extends string ? Decoder<D> : D extends number ? Decoder<D> : D extends {
    [key: string]: Definition;
} ? Decoder<{
    [key in keyof D]: DecoderFromDefinition<D[key]> extends Decoder<infer A> ? A : never;
}> : never;
export declare const schema: <D extends Definition>(definition: D) => DecoderFromDefinition<D>;
export {};
//# sourceMappingURL=index.d.ts.map