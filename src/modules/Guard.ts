
import $msg from 'message-tag';
import assert from 'assert';

import * as ObjectUtil from '../util/ObjectUtil.js';


export type Guard<A> = {
    is : (input : unknown) => input is A,
};

export type TypeOf<G> = G extends Guard<infer A> ? A : never;


//
// Basic constructors
//

export const unknown : Guard<unknown> = {
    is : (input : unknown) : input is unknown => true,
};

export const never : Guard<never> = {
    is : (input : unknown) : input is never => false,
};

export const unit : Guard<null> = {
    is : (input : unknown) : input is null => input === null,
};

export const undef : Guard<undefined> = {
    is : (input : unknown) : input is undefined => typeof input === 'undefined',
};

export const string : Guard<string> = {
    is : (input : unknown) : input is string => typeof input === 'string',
};

export const number : Guard<number> = {
    is : (input : unknown) : input is number => typeof input === 'number',
};

export const boolean : Guard<boolean> = {
    is : (input : unknown) : input is boolean => typeof input === 'boolean',
};


//
// Complex constructors
//

type Unknown = Guard<unknown>;
type RecordOf<T> = Record<PropertyKey, T>;
type MapTypeOf<T> = { [key in keyof T] : TypeOf<T[key]> };

export const record = <P extends RecordOf<Unknown>>(props : P) : Guard<MapTypeOf<P>> => ({
    is : (input : unknown) : input is MapTypeOf<P> => {
        if (typeof input !== 'object' || input === null) {
            return false;
        }
        
        const propsKeys = Object.keys(props);
        const inputKeys = Object.keys(input);
        
        // Check if the key sets are equal
        if (inputKeys.length !== propsKeys.length || !propsKeys.every(key => inputKeys.includes(key))) {
            return false;
        }
        
        const inputWithKeys = input as { [key in keyof P] : unknown };
        
        // Check if all props are valid
        if (!propsKeys.every(key => props[key].is(inputWithKeys[key]))) {
            return false;
        }
        
        return true;
    },
});

// export const variant = <P extends RecordOf<Unknown>>(alts : P) : Guard<MapTypeOf<P>> => ({
//     is : (input : unknown) : input is MapTypeOf<P> => {
//         // TODO
//     },
// });
