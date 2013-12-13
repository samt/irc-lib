/*
 * irc-lib
 *
 * (c) 2013 Sam Thompson <samdtho@gmail.com>
 * The MIT License - http://opensource.org/licenses/MIT
 */

var net = require('net'),
  readline = require('readline'),
  events = require('events'),
  ircmsg = require('./ircmessage');

function Client(options) {
  if (typeof options == 'undefined') {
    options = {};
  }

  this._socket = null;
  this._manual = !!options.manual || false;
  this._nick = options.nick || '';
  this._user = options.user || '';
  this._pass = options.pass || options.password || '';
  this._realname = options.realname || '';

  this.chans = [];
}

/*
 * Inherit from the EventEmitter
 */
Client.prototype.__proto__  = events.EventEmitter.prototype;

/*
 * Connect to the server
 */
Client.prototype.connect = function (host, port) {
  port = port || 6667;

  var $this = this,
    lo = {},
    names = {},
    motd = '';

  $this._socket = new net.Socket();
  $this._socket.connect(port, host, function () {
    $this._socket.on('error', function (e) {
      //console.log('\n\n:(\n\n' + e);
    });

    var rl = readline.createInterface({
      input: $this._socket,
      output: $this._socket
    });

    rl.on('line', function (line) {
      lo = ircmsg.parse(line);
      // Generic emitters
      $this.emit('raw', lo.raw);
      $this.emit('raw.' + lo.command.toLowerCase(), lo);
    });
    
    rl.on('error', function() {
      // bot died...
      //console.log('bot died...');
    });

    //
    // Start all listeners for our bot
    //

    // send NICK and USER commands
    $this.on('connection', function () {    
      $this.sendRaw('NICK ' + $this._nick);
      $this.sendRaw('USER ' + $this._user + ' 8 * :' + $this._realname);
    });

    // username detection
    $this.on('raw.001', function (l) {
      $this._nick = l.args[0];
      if ($this._pass) {
        $this.sendRaw('PRIVMSG NickServ :IDENTIFY ' + $this._nick + ' ' + $this._pass);
      }
    });

    // pong
    $this.on('raw.ping', function (msg) {
      $this.sendRaw('PONG :' + msg.value);
    });

    // joins
    $this.on('raw.join', function (msg) {
      $this.emit('join', msg.args[0], msg.nick);
      $this.emit('join' + msg.args[0], msg.nick);

      if (msg.nick == $this._nick) {
        $this.emit('self.join', msg.args[0]);
        $this.chans[msg.args[0]] = {
          topic: '',
          mode: '',
          names: []
        };
      }
    });

    // privmsg
    $this.on('raw.privmsg', function (msg) {
       if (msg.args.length == 1) {
        if (msg.args[0].substr(0,1) == '#') {
          $this.emit('msg', msg.args[0], msg.nick, msg.value);
          $this.emit('msg' + msg.args[0], msg.nick, msg.value);
        }
        else if (msg.args[0] == $this._nick) {
          $this.emit('pm', msg.nick, msg.value);
        }
      }
    });

    // parts
    $this.on('raw.part', function (msg) {
      $this.emit('part', msg.args[0], msg.nick, msg.value);
      $this.emit('part' + msg.args[0], msg.nick, msg.value);
    });

    // quits
    $this.on('raw.quit', function (msg) {
      $this.emit('quit', msg.nick, msg.value);
    });

    // Topic
    $this.on('raw.332', function (msg) {
      $this.chans[msg.args[1]].topic = msg.value;
      $this.emit('topic', msg.args[1], msg.value);
      $this.emit('topic' + msg.args[1], msg.value);
    });
    
    // names
    $this.on('raw.353', function (msg) {
      $this.chans[msg.args[2]].names = $this.chans[msg.args[2]].names.concat(msg.value.split(' '));
    });

    // end of /NAMES
    $this.on('raw.366', function (msg) {
      $this.emit('names', msg.args[2], $this.chans[msg.args[2]].names);
      $this.emit('names' + msg.args[2], $this.chans[msg.args[2]].names);
    });

    $this.on('raw.372', function (msg) {
      motd += lo.value + '\n';
    });

    $this.on('raw.376', function (msg) {
      $this.emit('motd', motd);
    });

    // automatical check if identified
    $this.on('raw.notice', function (msg) {
      if (msg.nick.toLowerCase() == 'nickserv') {
        if (!!msg.value.match(/identified/)) {
          $this.emit('identified', msg.args[0]);
        }
      }
    });

    $this.emit('connection'); // emit our first event!
  });
};

Client.prototype.sendRaw = function (raw) {
  this._socket.write(raw.trim() + '\r\n');
  //console.log(raw.trim());
};

module.exports = Client;
