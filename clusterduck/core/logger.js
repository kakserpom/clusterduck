const diagnostics = require('diagnostics');

diagnostics.modify(function datetime(args, options) {
    args.unshift(new Date());
    return args;
});

module.exports = diagnostics
