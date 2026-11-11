// p-limit imports '#async_hooks', which its package.json maps to the Node built-in. Jest 29 resolves that
// mapping as a file path, so jest.config.js points '#async_hooks' here, and this re-exports the built-in.
module.exports = require('async_hooks');
