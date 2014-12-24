var fs = require('fs');
var https = require('https');
var events = require('events');
var url = require('url');
var crypt = require('apache-crypt');
var xml2json = require('xml2json');

var student_dir = '/afs/csail.mit.edu/proj/courses/6.004/Spring15/records/course/students/';

//////////////////////////////////////////////////
//
// initial setup
//
//////////////////////////////////////////////////

// set up https server listening on port 6004
var options = {
    key: fs.readFileSync(__dirname + '/6004.key'),
    cert: fs.readFileSync(__dirname + '/6004.crt'),
    ca: [fs.readFileSync(__dirname + '/mit-client.crt')],
    requestCert: true,
    rejectUnauthorized: false
};
https.globalAgent.options.secureProtocol = 'SSLv3_method';
var server = https.createServer(options, handler).listen(6004, function() {
    console.log("Queue server started");
});

// support requests for favicon by browser tab
var favicon;
fs.readFile(__dirname + '/favicon.ico',function (err,data) {
    if (err) console.log("Can't read favicon.ico!");
    else favicon = data;
});

// load queue client
var client;
fs.readFile(__dirname + '/client.html',function (err,data) {
    if (err) console.log("Can't read client.html!");
    else client = data;
});
fs.watch(__dirname + '/client.html',function (event, filename) {
    console.log('reload client');
    fs.readFile(__dirname + '/client.html',function (err,data) {
        if (err) client = undefined;
        else client = data.toString();
    });
});

// load message-of-the-day; watch for changes
var motd;
fs.readFile(__dirname + '/motd',function (err,data) {
    if (err) console.log("Can't read motd!");
    else motd = data.toString();
});
fs.watch(__dirname + '/motd',function (event, filename) {
    console.log('reload motd');
    fs.readFile(__dirname + '/motd',function (err,data) {
        if (err) motd = undefined;
        else motd = data.toString();
        if (queue_events) queue_events.emit('update');
    });
});

//////////////////////////////////////////////////
//
// handle user's HTTP requests
//
//////////////////////////////////////////////////

// deal with user requests
function handler(req, res) {
    var u = url.parse(req.url, true);

    // handle favicon requests
    if (u.pathname == '/favicon.ico') {
        if (favicon) {
            res.writeHead(200, {'Content-Length': favicon.length, 'Content-Type': 'x-icon'});
            return res.end(favicon);
        } else {
            res.writeHead(404);
            return res.end();
        }
    }

    if (u.pathname == '/validate') {
        var query,username,password;

        // see if we have certificate, otherwise use query parameters
        var cert = req.connection.getPeerCertificate();
        var using_cert;
        if (cert && cert.subject) {
            username = cert.subject.emailAddress;
            using_cert = true;
        } else {
            username = u.query.username || '???';
            password = crypt(u.query.password || '???','x4');
            using_cert = false;
        }

        username = username.split('@')[0].toLowerCase();   // canonicalize name
        if (username == '???') {
            res.writeHead(400,"No username");
            return res.end();
        }

        // try to read in user's status file
        fs.readFile(student_dir + username + '/status.xml',function (err,data) {
            if (err) console.log(err);
            else {
                try {
                    var status = xml2json.toJson(data.toString(),{object:true, coerce:false});
                    if (!using_cert && password != status.student.encrypted_password)
                        throw "Password mismatch";
                    res.writeHead(200, {'Content-Type': 'text/json'});
                    res.end(JSON.stringify({
                        username: username,
                        name: [status.student.name.first, status.student.name.family],
                        section: status.student.section
                    }));
                } catch (e) {
                    console.log(e);
                }
            }
            res.writeHead(401,"Bad username or password");
            res.end();
        });
        return;   // readFile will do the honors of replying...
    }

    // otherwise simply serve up the client-side queue html
    if (client) {
        res.writeHead(200);
        return res.end(client);
    } else {
        res.writeHead(500);
        return res.end('Error loading client.html');
    }
}

//////////////////////////////////////////////////
//
// The queue
//
//////////////////////////////////////////////////

// queue data: ordered list of queue entries
var queue = [];
var on_duty = {};

// communicate with clients via events
var connections = 0;
var queue_events = new events.EventEmitter();
queue_events.setMaxListeners(0);  // allow many listeners

// remove any pending requests for  user
function remove_requests(username) {
    for (var i = queue.length-1; i >= 0; i--) {
        if (queue[i].username == username) queue.splice(i,1);
    }
}

//////////////////////////////////////////////////
//
// socket.io for server-client communication
//
//////////////////////////////////////////////////

// client and server communicate using socket.io
var io = require('socket.io').listen(server);

// listen for interesting events on behalf of a new user
io.sockets.on('connection', function(socket) {
    var user_info;   // may be filled in later...

    connections += 1;   // ooh, a new connection

    // send queue update to client
    function update() {
        var msg = {
            queue: queue,
            on_duty: on_duty,
            connections: connections,
            time: new Date()
        };
        if (motd) msg.motd = motd;
        if (user_info) msg.user = user_info;
        socket.emit('update', msg);
    }
    queue_events.on('update',update);

    // socket events
    
    // client determined user from cert info
    socket.on('set-user', function (json) {
        user_info = json;
        if (user_info.section == 'staff') {
            on_duty[user_info.username] = {name: user_info.name[0]+' '+user_info.name[1],
                                           location:user_info.location
                                          };
        }
        queue_events.emit('update');
    });

    // user wants to add themselves to queue
    socket.on('sign-out', function (json) {
        if (user_info && on_duty[user_info.username])
            delete on_duty[user_info.username];
        queue_events.emit('update');
    });

    // user queue request
    socket.on('request', function (uinfo,request) {
        remove_requests(uinfo.username);
        if (request != 'remove') {
            uinfo.request = request;
            queue.push(uinfo);
        }
        queue_events.emit('update');
    });

    // staff helping request
    socket.on('help', function (username,sinfo,request) {
        if (request == 'remove') remove_requests(username);
        else if (request == 'help' || request == 'requeue') {
            // find entry for username on the queue
            for (var i = 0; i < queue.length; i += 1) {
                var entry = queue[i];
                if (entry.username == username) {
                    entry.being_helped = (request == 'help') ? sinfo : undefined;
                    break;
                }
            };
        }
        queue_events.emit('update');
    });

    // bye bye...
    socket.on('disconnect', function () {
        // remove our listeners, let everyone know
        queue_events.removeListener('update',update);
        connections -= 1;
        if (user_info) {
            if (on_duty[user_info.username])
                delete on_duty[user_info.username];
            remove_requests(user_info.username);
        }
        queue_events.emit('update');
    });

    // send everyone an update on the new arrival
    queue_events.emit('update');
});

