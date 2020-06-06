
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


const E = require('../lib-cjs/util/Either.js').Either;
const D = require('../lib-cjs/modules/Decoding.js');
const C = require('../lib-cjs/modules/Codec.js');
const Entity = require('../lib-cjs/modules/Entity.js');
const R = require('../lib-cjs/modules/Resolving.js');
const flatten = require('../lib-cjs/reporters/FlattenReporter.js').default;
const SummaryReporter = require('../lib-cjs/reporters/SummaryReporter.js').default;

const User = D.record({ name: D.string, score: D.number });
const app1 = D.record({
    users: D.dict(D.string, User),
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
    users: D.dict(D.string, D.record({
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
        
        posts: D.dict(D.string, { title: D.string }),
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
            //name: 'Bob', // Missing
            lastLogin: undefined,
            
            role: {
                nonexistent: { zone: 'A' },
            },
        },
    },
};

const app3 = D.record({
    foo: D.record({ x: D.string }),
    bar: R.reference(['..', 'foo']),
});

Object.assign(replServer.context, {
    E,
    D,
    C,
    Entity,
    R,
    flatten,
    SummaryReporter,
    
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
    
    app3,
});
