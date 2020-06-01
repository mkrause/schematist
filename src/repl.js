
// Custom REPL
// $ npm run --silent build:cjs && node --experimental-repl-await ./src/repl.js

const inspect = require('util').inspect;
const repl = require('repl');

const replServer = repl.start({
    writer: object => inspect(object, {
        colors: true,
        depth: Infinity,
        showProxy: false,
    }),
});

replServer.setupHistory(`/tmp/schematist_repl-history.txt`, (err, repl) => {});


const D = require('../lib-cjs/modules/Decoding.js');
const FlattenReporter = require('../lib-cjs/reporters/FlattenReporter.js');
const TextReporter = require('../lib-cjs/reporters/TextReporter.js');

Object.assign(replServer.context, {
    D,
    FlattenReporter,
    TextReporter,
    
    orThrow: result => {
        if (result.left) {
            throw result.left;
        } else {
            return result.right;
        }
    },
    
    User: D.record({ name: D.string, score: D.number }),
    //app1: D.record({ ... }),
});
