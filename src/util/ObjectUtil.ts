
export const hasProp = <K extends PropertyKey>(obj : object, key : K) : obj is { [key in K] : unknown } =>
    key in obj;

export const hasOwnProp = <K extends PropertyKey>(obj : object, key : K) : obj is { [key in K] : unknown } =>
    Object.prototype.hasOwnProperty.call(obj, key);

export const isObjectLike = (obj : unknown) : obj is object =>
    typeof obj !== 'undefined' && obj !== null;

export const isObject = (obj : unknown) : obj is { [key in PropertyKey] : unknown } =>
    obj !== null && (typeof obj === 'object' || typeof obj === 'function');

export const isPlainObject = (obj : unknown) : obj is { [key in PropertyKey] : unknown } => {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }
    
    const proto = Object.getPrototypeOf(obj);
    return proto === null || proto === Object.prototype;
};


// https://github.com/Microsoft/TypeScript/pull/12253#issuecomment-393954723
export const keys = Object.keys as <T>(o: T) => (Extract<keyof T, string>)[];


export const map = <O extends {}, Result>(obj : O, fn : (value : O[keyof O], key : keyof O) => Result)
    : { [key in keyof O] : Result } => {
        const result : { [key : string] : Result } = {};
        for (const key in obj) {
            result[key] = fn(obj[key], key);
        }
        return result as any;
    };
