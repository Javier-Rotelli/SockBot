'use strict';
/**
 * Command Parser for SockBot2.0
 * @module commands
 * @author Accalia
 * @license MIT
 */

const config = require('./config');

const internals = {
    mention: null,
    parseShortCommand: parseShortCommand,
    parseMentionCommand: parseMentionCommand,
    events: null
};
/**
 * Parsed Command Data
 *
 * @name command
 * @typedef {object}
 * @param {string} input Raw Command Input
 * @param {string} command Command name
 * @param {string[]} args Command arguments
 * @param {string} mention Mention text that was included in command
 * @param {external.posts.CleanedPost} post Post that triggered the command
 */

/**
 * Perpare the command parser
 *
 * Needs to be called to set the internals of the parser after reading config file.
 *
 * @param {EventEmitter} events EventEmitter that will be core comms for SockBot
 * @param {completedCallback} callback Completion callback
 */
exports.prepareParser = function prepareParser(events, callback) {
    internals.mention = new RegExp('^@' + config.core.username + '\\s\\S{3,}(\\s|$)', 'i');
    internals.events = events;
    callback(null);
};

/**
 * Parse a short command from input line
 *
 * @param {string} line Input line to parse
 * @returns {command} Parsed command
 */
function parseShortCommand(line) {
    if (!/^!\S{3,}(\s|$)/.test(line)) {
        return null;
    }
    const args = line.split(/\s+/),
        command = args.shift().substring(1).toLowerCase();
    return {
        input: line,
        command: command,
        args: args,
        mention: null
    };
}

/**
 * Parse a mention command from input line
 *
 * @param {string} line Input line to parse
 * @returns {command} Parsed command
 */
function parseMentionCommand(line) {
    if (!internals.mention.test(line)) {
        return null;
    }
    const args = line.split(/\s+/),
        mention = args.shift(),
        command = args.shift().toLowerCase();
    return {
        input: ('!' + command + ' ' + args.join(' ')).replace(/\s+$/, ''),
        command: command,
        args: args,
        mention: mention
    };
}

/**
 * Parse commands from post and emit command events
 *
 * @param {external.posts.CleanedPost} post Post to parse commands from
 * @param {parseCallback} callback CompletionCallback
 */
exports.parseCommands = function parseCommands(post, callback) {
    if (typeof callback !== 'function') {
        throw new Error('callback must be supplied');
    }
    if (!post || !post.raw) {
        callback(null, []);
        return;
    }
    const commands = post.raw.split('\n').map((line) => line.replace(/\s+$/, '')).map((line) => {
        if (line[0] === '!') {
            return internals.parseShortCommand(line);
        } else {
            return internals.parseMentionCommand(line);
        }
    }).filter((command) => !!command);
    commands.forEach((command) => {
        setImmediate(() => {
            command.post = post;
            const handled = internals.events.emit('command#' + command.command, command);
            if (!handled && !command.mention) {
                if (!internals.events.emit('command#ERROR', command)) {
                    internals.events.emit('error', new Error('command `' + command.command + '` was unhandled.'));
                }
            }
        });
    });
    callback(null, commands);
};

/**
 * Completion Callback
 *
 * @param {Exception} [err=null] Error encountered processing request
 */
function completedCallback(err) {} //eslint-disable-line handle-callback-err, no-unused-vars

/**
 * Parse Completion Callback
 *
 * @param {Exception} [err=null] Error encountered processing request
 * @param {command[]} commands Parsed Commands
 */
function parseCallback(err, commands) {} //eslint-disable-line handle-callback-err, no-unused-vars

/* istanbul ignore else */
if (typeof GLOBAL.describe === 'function') {
    //test is running
    exports.internals = internals;
    exports.stubs = {
        completedCallback: completedCallback,
        parseCallback: parseCallback
    };
}
