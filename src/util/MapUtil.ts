
import $msg from 'message-tag';


export const fromObject = <O extends object, K extends string | number>(object : O) : Map<K, unknown> => {
    return Object.entries(object).reduce(
        (acc, [key, value]) => {
            acc.set(key as K, value);
            return acc;
        },
        new Map<K, unknown>(),
    );
};

export const toObject = <K, V>(map : Map<K, V>) => {
    return [...map.entries()].reduce(
        (acc, [key, value]) => {
            if (typeof key !== 'string' && typeof key !== 'number') {
                throw new TypeError($msg`Cannot convert Map to object, found incompatible key ${key})`);
            }
            
            acc[key] = value;
            return acc;
        },
        {} as { [x : string] : unknown },
    );
};

export const fromArray = <A extends Array<unknown>, K extends number>(array : A) : Map<K, unknown> => {
    return array.reduce(
        (acc : Map<K, unknown>, value, index) => {
            acc.set(index as K, value);
            return acc;
        },
        new Map<K, unknown>(),
    );
};

export const toArray = <K, V>(map : Map<K, V>) => {
    return [...map.entries()].reduce(
        (acc, [key, value]) => {
            if (typeof key !== 'number') {
                throw new TypeError($msg`Cannot convert Map to array, found incompatible key ${key})`);
            }
            
            acc[key] = value;
            return acc;
        },
        [] as Array<unknown>,
    );
};


//export const upsert = () => ... // TODO
