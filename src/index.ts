
import * as s from './schematist.js';
import type { Definition } from './schematist.js';


export * from './schematist.js';

export const m = Object.assign(
    (model : Definition) => s.schema(model),
    s,
    { $: s.option },
);


export const example1 = m({
    users: [m.dict, {
        name: m.string,
        role: m.option({
            admin: m.unit,
            user: m.unit,
        }),
    }],
});
