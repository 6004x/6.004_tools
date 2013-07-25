//DEPENDENCIES: connect, fs, https, querystring
var fs = require("fs");
var https = require("https");
var connect = require("connect"); 
var qs = require('querystring');
var libraryHandler = require('./libraryHandler.js')

function authenticate_user(req,res,next) {
	console.log('authenticate?')
    var user = req.connection.getPeerCertificate().subject.emailAddress;
    req.user = user.split('@')[0];
    next();
}

var app = connect()
	.use(authenticate_user)
    //.use(connect.bodyParser())   // set req.body with incoming data
    //.use('/libraries',library_handler)  // handle requests involving module libraries
    //.use(connect.static(__dirname + '/courseware'))  // serve files from ./courseware
    .use(serverFunction);

function serverFunction(request, response, next){
	
	if (request.method == 'GET')
	{	
		console.log(request.user);
		var data = JSON.stringify({user:request.user, data:'GET'});
		console.log(data);
		response.writeHead(200,{
			'Content-Length' : data.length,
			'Access-Control-Allow-Origin' : '*',
			//FIX THE ACCESS CONTROL SOON
			    });
		response.write(data);
		response.end();
	} else if (request.method == 'POST'){
		console.log('post');
		//pull the data from the POST body requestuest
		console.log('post method');
		var body = '';
		request.on('data', function (data) {
			body += data;
			// 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
			if (body.length > 1e6) { 
				// FLOOD ATTACK OR FAULTY CLIENT, NUKE REQUEST
				request.connection.destroy();
			}
		});
		request.on('end', function () {

			var POST = qs.parse(body);
			// use POST
			console.log(POST);
			console.log('use post');
			libraryHandler.getLibraryHandler(request, response, POST);
		});	
		console.log(body);
	}
	else
		next();
}

var options = {
	key: fs.readFileSync('./ssl-private-key.pem'),
  	cert: fs.readFileSync('./ssl-certificate.pem'),
  	ca:[ fs.readFileSync('./ssl-ca.pem') ],
    requestCert: true,
    rejectUnauthorized: true,
    'Access-Control-Allow-Origin' : '*',
};

var server = https.createServer(options,app).listen(6004,function(){
	console.log("Courseware server started");
	
});
