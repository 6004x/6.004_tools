var fs = require('fs');
var https = require('https');
var events = require('events');
var url = require('url');
var crypt = require('apache-crypt');
var xml2json = require('xml2json');

var student_dir = '/afs/csail.mit.edu/proj/courses/6.004/CurrentTerm/records/course/students/';

//////////////////////////////////////////////////
//
// initial setup
//
//////////////////////////////////////////////////

// set up https server listening on port 6004
var crtdir = '/etc/apache2/ssl.crt';
var options = {
    key: fs.readFileSync(crtdir + '/6004.key'),
    cert: fs.readFileSync(crtdir + '/6004.crt'),
    ca: [fs.readFileSync(crtdir + '/mit-client.crt')],
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

// timeouts pending keyed by username
var pending_timeouts = {};

// communicate with clients via events
var connections = 0;
var queue_events = new events.EventEmitter();
queue_events.setMaxListeners(0);  // allow many listeners

// remove any pending requests for  user
function remove_requests(username,staff) {
    for (var i = queue.length-1; i >= 0; i--) {
        // don't remove queue entries if they are being helped,
        // let TA take care of it!
        if (queue[i].username == username && (staff || !queue[i].being_helped))
            queue.splice(i,1);
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

    // clean-up when user leaves
    function clean_up() {
        if (user_info) {
            if (on_duty[user_info.username])
                delete on_duty[user_info.username];
            remove_requests(user_info.username);
            user_info = undefined;
        }
        queue_events.emit('update');
    }

    // socket events
    
    // client determined user from cert info
    socket.on('set-user', function (json) {
        user_info = json;

        // if there are any pending timeouts for this user, cancel them.
        // this will solve the problem of dropped connections causing users
        // to get wiped from the queue, assuming they log back in quickly 
        // enough
        var timeout = pending_timeouts[user_info.username];
        if (timeout) {
            clearTimeout(timeout);
            pending_timeouts[user_info.username] = undefined;
        }

        if (user_info.section == 'staff') {
            on_duty[user_info.username] = {name: user_info.name[0]+' '+user_info.name[1],
                                           location:user_info.location
                                          };
        }
        queue_events.emit('update');
    });

    // user is signing-off, so clean up any pending requests
    socket.on('sign-out', clean_up);

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
        if (request == 'remove') remove_requests(username,true);
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
            // not sure if we need to worry about this, but...
            var timeout = pending_timeouts[user_info.username];
            if (timeout) clearTimeout(timeout);

            // clean up any pending requests if we don't hear
            // back from the user in one minute.  Keep track
            // of timeout so we cancel it if user reconnects
            // and signs in again before a minute has passed.
            pending_timeouts[user_info.username] = setTimeout(clean_up,60*1000);
        }
    });

    // send everyone an update on the new arrival
    queue_events.emit('update');
});
