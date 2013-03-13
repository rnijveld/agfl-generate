{
    var _ = require('underscore');
    var util = require('util');
    var context = {
        rules: {},
        types: {},
        grammar: null,
        root: null
    };
}

start = line* SPACE? {
    return context;
}

line = SPACE? entry:entry SPACE? '.'

entry = thing:(grammar / root / type_def / rule)

grammar = 'GRAMMAR'i SPACE? id:ID {
    if (context.grammar !== null) {
        throw new Error("Multiple GRAMMAR keywords");
    } else {
        context.grammar = id;
    }
}

root = 'ROOT'i SPACE? id:ID {
    if (context.root !== null) {
        throw new Error("Multiple ROOT keywords");
    } else {
        context.root = id;
    }
}

type_def = type:ID SPACE? '::' SPACE? values:type_options {
    if (typeof context.types[type] !== 'undefined' && context.types[type] !== null) {
        throw new Error(util.format("Multiple definitions of type %s", type));
    }
    context.types[type] = values;
}

type_options = first:ID rest:(SPACE? '|' SPACE? ID)* {
    var items = _(rest).map(function (item) { return item[3]; });
    items.unshift(first);
    return items;
}

rule = name:ID SPACE? args:args? SPACE? ':' SPACE? choices:choices {
    if (typeof context.rules[name] !== 'undefined' && context.rules[name] !== null) {
        throw new Error(util.format("Multiple definitions of rule %s", name));
    }
    if (typeof args === 'string') {
        args = [];
    }

    context.rules[name] = {
        args: args,
        choices: choices
    };
}

choices = first:choice rest:(SPACE? ';' SPACE? choice)* {
    var items = _(rest).map(function (item) { return item[3]; });
    items.unshift(first);
    return items;
}

choice = first:token rest:(SPACE? ',' SPACE? token)* {
    var items = _(rest).map(function (item) { return item[3]; });
    items.unshift(first);
    var types = _(items).filter(function (item) { return item.what === 'type'; });
    var tokens = _(items).filter(function (item) { return item.what !== 'type'; });

    var ruletypes = {};
    _(types).each(function (type) {
        if (typeof ruletypes[type.type] !== 'undefined' && ruletypes[type.type] !== null) {
            throw new Error(util.format("Multiple values for the type %s in a choice", type.type));
        }

        ruletypes[type.type] = type.value;
    });

    return {
        tokens: tokens,
        types: ruletypes
    };
}

token = thing:(type / call / STRING) {
    if (typeof thing === 'string') {
        thing = {
            what: 'string',
            value: thing
        };
    }
    return thing;
}

type = '{' SPACE? type:ID SPACE? '::' SPACE? value:ID SPACE? '}' {
    return {
        what: 'type',
        type: type,
        value: value
    };
}

call = name:ID args:args? {
    if (typeof args === 'string') {
        args = [];
    }

    return {
        what: 'call',
        name: name,
        args: args
    };
}

args = '(' arglist:arglist ')' {
    return arglist;
}

arglist = first:ID rest:(SPACE? ',' SPACE? ID)* {
    var items = _(rest).map(function (item) { return item[3]; });
    items.unshift(first);
    return items;
}

STRING = str:('"' ([^"\\] / '\\"'/ '\\')* '"') {
    var s = _(str).flatten().join('');
    return s.substr(1, s.length - 2);
}

ID = id:([a-zA-Z_-] [a-zA-Z0-9_-]*) {
    return _(id).flatten().join('');
}

SPACE = ([ \f\n\r\t\v\u00A0\u2028\u2029] / '#' [^\n]* )*
