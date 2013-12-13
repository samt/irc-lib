/*
 * irc-lib
 *
 * (c) 2013 Sam Thompson <samdtho@gmail.com>
 * The MIT License - http://opensource.org/licenses/MIT
 */

function parse(line) {
  var ln = line.trim().match(/(:([\S]+) )?([\S]+)([^:]+)?(:(.+))?/);
  var pre = (typeof ln[2] !== 'undefined') ? ln[2].match(/([^\!]+)\!([^@]+)@(.+)|(.+)/) : ['','','','',''];

  return {
    raw: line,
    prefix: ln[2] || '',
    nick: pre[1] || '',
    user: pre[2] || '',
    host: pre[3] || pre[4] || '',
    command: ln[3],
    args: ln[4].trim().split(' '),
    value: ln[6] || ''
  };
}

module.exports.parse = parse;
