var util = require('util');
var _ = require('underscore');
var parser = require('./grammar/agfl.js');

/**
 * Generates a sample for the given rule in the given grammar
 * @param  {Object}   grammar The grammar object
 * @param  {Function} joiner  A joiner function, may also be a string
 * @param  {String}   rule    The rule for which a sample should be generated
 * @param  {Array}    args    List of arguments for the rule
 * @return {String}   A random sample
 */
var generateExample = function (grammar, joiner, rule, args) {
    if (typeof args === 'undefined' || args === null) {
        args = [];
    }

    if (typeof grammar.rules[rule] !== 'undefined' && grammar.rules[rule] !== null) {
        var selected = grammar.rules[rule];
        if (args.length !== selected.args.length) {
            throw new Error(util.format(
                "Trying rule %s with %d parameters, expected %d parameters",
                rule,
                args.length,
                selected.args.length
            ));
        } else {
            var types = {};
            for (var i = 0; i < args.length; i += 1) {
                var type = grammar.types[selected.args[i]];
                types[selected.args[i]] = args[i];
            }
            var choice = makeChoice(selected.choices, types, args.length, rule);
            return applyTokens(grammar, joiner, choice.tokens, types);
        }
    } else {
        throw new Error(util.format("Undefined rule %s", rule));
    }
};

/**
 * When an alternative is chosen, work out all the tokens.
 * @param  {Object}   grammar The grammar on which we're working
 * @param  {Function} joiner  Joiner function, can also be a string
 * @param  {Array}    tokens  List of tokens from the selected alternative.
 * @param  {Object}   args    List of argument names and their values.
 * @return {String}
 */
var applyTokens = function (grammar, joiner, tokens, args) {
    return _(tokens).map(function (token) {

        var returnValue = "";
        var isTerminal = false;

        if (token.what === 'string') {
            // basic terminal string
            returnValue = token.value;
            isTerminal = true;
        } else if (token.what === 'call') {
            // retrieve the result from another rule
            var arglist = _(token.args).map(function (arg) {
                if (typeof args[arg] !== 'undefined' && args[arg] !== null) {
                    return args[arg];
                } else {
                    var type = grammar.types[arg];
                    if (typeof type !== 'undefined' && type !== null) {
                        return type[Math.floor(Math.random() * type.length)];
                    } else {
                        return arg;
                    }
                }
            });
            returnValue = generateExample(grammar, joiner, token.name, arglist);
        }

        // either use the joiner function or append the joiner string
        if (typeof joiner === 'function') {
            return joiner(returnValue, isTerminal);
        } else {
            if (isTerminal) {
                return returnValue + joiner;
            } else {
                return returnValue;
            }
        }

    // finally merge all tokens together to form the string
    }).join('');
};

/**
 * Pick a choice from a list of alternatives.
 * If arguments are given, only those alternatives that match the choice will
 * be selected.
 * @param  {Array} choices  List of alternatives for the rule
 * @param  {Object} args    List of argument names and their values
 * @param  {Number} argsize Number of arguments
 * @param  {String} rule    Name of the rule, for error reporting purposes
 * @return {Array}          The alternative chosen from the list of possibilities
 */
var makeChoice = function (choices, args, argsize, rule) {
    if (argsize > 0) {
        choices = _(choices).filter(function (choice) {
            return _(choice.types).all(function (value, type) {
                return args[type] === value;
            });
        });
    }

    if (choices.length === 0) {
        throw new Error(util.format(
            "Reached dead end for rule %s with args %s",
            rule,
            _(args).map(function (value) { return value; }).join(', ')
        ));
    } else if (choices.length === 1) {
        return choices[0];
    } else {
        return choices[Math.floor(Math.random() * choices.length)];
    }
};

module.exports.parse = parser.parse;
module.exports.SyntaxError = parser.SyntaxError;
module.exports.generateExample = generateExample;
