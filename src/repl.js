
// Custom REPL
// $ npm run --silent build:cjs && node ./src/repl.js

const inspect = require('util').inspect;
const repl = require('repl');

const replServer = repl.start({
    useGlobal: true,
    writer: object => inspect(object, {
        colors: true,
        depth: Infinity,
        showProxy: false,
    }),
});

replServer.setupHistory(`/tmp/schematist_repl-history.txt`, (err, repl) => {});


const D = require('../lib-cjs/modules/Decoding.js');
const C = require('../lib-cjs/modules/Codec.js');
const flatten = require('../lib-cjs/reporters/FlattenReporter.js').default;
const TextReporter = require('../lib-cjs/reporters/TextReporter.js').default;

const User = D.record({ name: D.string, score: D.number });
const app1 = D.record({
    users: D.dict(User),
});

const instance1Valid = {
    users: {
        john: { name: 'John', score: 10 },
        alice: { name: 'Alice', score: 42 },
    },
};
const instance1Invalid = {
    users: {
        john: { name: null, score: 10 },
        alice: { name: 'Alice', score: '42' },
    },
};

const app2 = D.record({
    users: D.dict(D.record({
        name: D.string,
        
        lastLogin: D.maybe(D.number),
        
        role: D.variant({
            user: D.record({
                permissions: D.string,
            }),
            admin: D.record({
                zone: D.string,
            }),
        }),
        
        posts: D.dict({ title: D.string }),
    })),
});

const instance2Valid = {
    users: {
        alice: {
            name: 'Alice',
            lastLogin: null,
            role: {
                admin: { zone: 'A' },
            },
        },
    },
};
const instance2Invalid = {
    users: {
        bob: {
            //name: 'Bob',
            lastLogin: undefined,
            
            role: {
                nonexistent: { zone: 'A' },
            },
        },
    },
};

Object.assign(replServer.context, {
    D,
    C,
    flatten,
    TextReporter,
    
    orThrow: result => {
        if (result.left) {
            throw result.left;
        } else {
            return result.right;
        }
    },
    
    User,
    
    app1,
    instance1Valid,
    instance1Invalid,
    
    app2,
    instance2Valid,
    instance2Invalid,
});
