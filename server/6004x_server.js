//DEPENDENCIES: connect, rimraf
var url=require('url');
var fs = require("fs");
var https = require("https");
var connect = require("connect");
var path = require('path');
var qs = require('querystring');
var rimraf = require('rimraf');
//var libraryHandler = require('./libraryHandler.js');

https.globalAgent.options.secureProtocol = 'SSLv3_method';

function authenticate_user(req,res,next) {
    if(req.connection.getPeerCertificate().subject) { // req.authorized doesn't seem to work...
        var user = req.connection.getPeerCertificate().subject.emailAddress;
        req.user = user.split('@')[0];
        next();
    } else {
        res.writeHead(403); // No cert
        res.write("Client certificate required.");
        res.end();
    }
}

function cors_preflight(request, response, next) {
    if(request.method == 'OPTIONS') {
        response.writeHead(200);
        response.end();
    } else next();
}

function inject_cors(request, response, next) {
    var write = response.writeHead.bind(response);
    response.writeHead = function(status, headers) {
        headers = headers || {};
        headers['Access-Control-Allow-Origin'] = request.headers.origin || '*';
        headers['Access-Control-Allow-Credentials'] = 'true';
        write(status, headers);
    };
    next();
}

var app = connect()
//.use(connect.logger({immediate: true, format: 'dev'}))
	.use(inject_cors)
	.use(cors_preflight)
	.use(authenticate_user)
	.use(serverFunction);


function serverFunction(request, response, next) {
    //console.log("method: "+request.method);
    if (request.method == 'POST') {
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
            var POST = JSON.parse(qs.parse(body).data);
            libraryHandler(request, response, POST);
        });
    }
    else next();
}

var options = {
    key: fs.readFileSync('/home/6.004x/6004.key'),
    cert: fs.readFileSync('/home/6.004x/6004.crt'),
    ca: [fs.readFileSync('/home/6.004x/mit-client.crt')],
    requestCert: true,
    rejectUnauthorized: false
};

var server = https.createServer(options, app).listen(6004, function() {
    console.log("Courseware server started");
});

var libraryHandler = function(request, response, postData) {
    var root_path = '/home/6.004x'; //process.cwd();//__dirname
    //current directory will hold all user files in /files
    var lib_path = path.join(root_path, 'files');
    //other relevant paths to be instantiated as the user logs in.
    var m_user_path, m_full_path, m_shared_root_path, m_shared_full_path;
    var m_is_shared = false;

    var m_file_path = path.normalize(unescape(url.parse(request.url).pathname));

    var user = request.user;
    var query = String(postData.query);
    var fileObj = postData.fileObj;
    var otherFileObj = postData.otherFileObj;
    // console.log(fileObj)
    var fileData = fileObj.data;

    if(user) {
        m_user_path = path.join(lib_path, user); //user path in libraries
        m_shared_root_path = path.join(root_path, 'shared'); //shared folder outside of user libraries
        m_full_path = path.join(m_user_path, m_file_path); //full path of file/folder we are accessing
        if(m_file_path.indexOf('/shared/') === 0) {
            m_full_path = path.join(m_shared_root_path, m_file_path.substr(8)); // Search inside the shared folder.
            m_is_shared = true;
        }
    }

    if(!fs.existsSync(m_user_path)) { //user doesn't have a library yet...
        create_user_path();
    }

    //console.log(user + ' wants ' + query);

    var full_dir_name = path.dirname(m_full_path);
    var user_dir_name = path.dirname(m_file_path);
    var file_name = path.basename(m_file_path);

    fs.exists(m_full_path, function(exists){
        try{
            // do the funcion in the query after checking if it exists
            functions[query](exists);
        } catch(e) {
            errorResponse(e);
        }
    });

    var functions  = {
        getUser: function(exists) {
            sendJSON({user: user});
        },
        getFile: function(exists) {
            //console.log('file path is '+ m_full_path);

            if (!exists) {
                errorResponse('could not find the file');
            } else {
                fs.lstat(m_full_path, function(err, stats){
                    if(stats.isDirectory()){ //assuring that it is a file
                        errorResponse('the file is a folder, oops for you');
                    } else {
                        getAutoSave(m_full_path, m_file_path, function(asv_data){
                            var saveAndBackup = {};
                            if(asv_data){
                                saveAndBackup.autosave = asv_data;
                            }
                            sendFile(m_full_path, m_file_path, saveAndBackup);
                        });
                    }
                });
            }
        },
        getFileList: function(exists){
            //console.log('file path is '+ m_full_path);
            if (!exists) {
                errorResponse('could not find the directory');
                //should never really happen
            } else {
                var fileList = recurseThroughFolders(m_full_path, '');
                //console.log('returned from fileList');
                sendJSON({
                    user: user,
                    data: fileList
                });
            }
        },
        saveFile: function(exists) {
            if(m_is_shared) {
                errorResponse('Cannot write to shared files.');
                return;
            }
            fs.exists(path.dirname(m_full_path), function(parent_exists){
                //making sure the directory exists...
                if(parent_exists) {
                    if(!exists) {
                        //if directory exists, and file doesn't exist, just make the file. 
                        saveFile(m_full_path, m_file_path, fileObj);
                    } else {
                        //if the file exists, rename to a backup
                        makeBackup(m_full_path, m_file_path, fileObj, function(data){
                            saveFile(m_full_path, m_file_path, fileObj);
                        });
                    }
                } else {
                    //console.log('path of file does not exist');
                    var pathdiff = path.relative(m_full_path, m_user_path);
                    //console.log(pathdiff);
                    //console.log(m_full_path);
                    //do something with patthdiff...
                    fs.mkdir(path.dirname(m_full_path), function(err){
                        if(err){
                            //console.log(err);
                            errorResponse(err + ' could not make directory');
                        } else {
                            saveFile(m_full_path, m_file_path, fileObj);
                        }
                    });
                }
            });
        },
        autoSaveFile: function(exists) {
            if(m_is_shared) {
                errorResponse('Cannot write to shared files.');
                return;
            }
            //AutoSaVe file
            //console.log('autosave, does it work?')
            makeAutoSave(m_full_path, m_file_path, fileObj);
            sendJSON({name: m_file_path, data: fileData});
        },
        newFolder: function(exists) {
            if(m_is_shared) {
                errorResponse('Cannot write to shared files.');
                return;
            }
            if(exists){
                errorResponse('path already exists at ' + m_file_path);
            } else {
                //console.log('mkdir path');
                fs.mkdir(m_full_path, function(err) {
                    if(err) {
                        //console.log(err);
                        errorResponse(err + ' path could not be made');
                    } else {
                        sendJSON({user_path: m_user_path, status: 'success'});
                    }
                });
            }
        },
        deleteFile: function(exists) {
            if(m_is_shared) {
                errorResponse('Cannot write to shared files.');
                return;
            }
            if(exists) {
                hide(m_full_path, m_file_path);
            } else {
                errorResponse(m_file_path + ' does not exist');
            }
        },
        renameFile: function(exists) {
            if(m_is_shared) {
                errorResponse('Cannot write to shared files.');
                return;
            }
            if(exists) {
                renameFile(m_full_path, m_file_path, otherFileObj.name);
            } else {
                errorResponse(m_file_path + ' does not exist');
            }
        },
        getRelative: function(exists) {
            if(exists) {
                var rel_path = otherFileObj.name;
                //console.log(rel_path);
                var new_path = (path.join(path.dirname(m_file_path), rel_path));
                var new_full_path = (path.join(m_user_path, new_path));
                //console.log('new_path');
                //console.log(new_full_path)
                sendFile(new_full_path, rel_path);
            } else {
                //console.log(otherFileObj.name)
                errorResponse( m_file_path + 'does not exist');
            }
        },
        getBackup: function(exists) {
            if(exists) {
                sendBackup(m_full_path, m_file_path);
            }
        }
    };

    function recurseThroughFolders(curr_path, user_path) {
        //console.log(curr_path);
        var files = fs.readdirSync(curr_path);
        var contentType = {};
        var fileList = {
            'path': user_path,
            'type': 'folder',
            'folders': {},
            'files': {},
            'name': user,
        };
        for(var i = 0; i < files.length; i++) {
            var name = files[i];
            var new_curr_path = path.join(curr_path, name);
            var new_user_path = user_path + name;
            if(name.indexOf('~') < 0) {
                if(fs.lstatSync(new_curr_path).isDirectory()) {
                    new_user_path += '/';
                    fileList.folders[name] = (recurseThroughFolders(new_curr_path, new_user_path));
                    fileList.folders[name].name = name;
                    for(var type in fileList.folders[name].contentType) {
                        if(contentType[type] === null)
                            contentType[type] = 0;
                        contentType[type] += fileList.folders[name].contentType[type];
                    }
                } else {
                    var type = name.split('.').pop();
                    fileList.files[name] = ({
                        'type': 'file',
                        'path': new_user_path,
                        'name': name,
                    });
                    if(contentType[type] === null)
                        contentType[type] = 1;
                    else
                        contentType[type]++;
                }
            } else {
                //console.log(name +' is a deleted file, folder, or backed up');
            }
        }
        fileList['contentType'] = contentType;
        return(fileList);
    }

    function errorResponse(string){
        console.log('ERROR: '+string);
        response.writeHead(404, {
            "Content-Type": "text/plain"
        });
        response.write('error: ' + string);
        response.end();
    }
    
    function sendJSON(data) {
        var sdata = JSON.stringify(data);
        response.writeHead(200, {
            'Content-Length': Buffer.byteLength(sdata),
            'Content-Type': 'application/json'
        });
        response.end(sdata);
        //console.log('data sent: '+sdata);
	//console.log('data length: '+sdata.length);
    }

    function sendFile(full_path, file_path, saveAndBackup) {
        fs.readFile(full_path, 'utf8', function(err,data) {
            if (err) {
                //console.log(err);
                errorResponse(err+' file could not be read');
            }

            if(file_path.substring(0, 1) === '/')
                file_path = file_path.substring(1);

            //console.log(file_path)
            var fileSend = {
                name: file_path,
                data: data,
                status: 'success',
                type: 'file',
                shared: m_is_shared
            };

            if(saveAndBackup) {
                //console.log(saveAndBackup)
                if(saveAndBackup.autosave) {
                    fileSend.autosave =  saveAndBackup.autosave;
                }
                if(saveAndBackup.backup) {
                    // fileSend.backup = saveAndBackup.backup;
                }
            }
            sendJSON(fileSend);
        });
    }

    function saveFile(full_path, file_path, fileObj) {
        fs.rename(full_path, full_path + '~bak', function() {
            fs.writeFile(full_path, fileObj.data, 'utf8', function (err) {
                if (err) {
                    //console.log(err);
                    errorResponse({
                        name: file_path,
                        status: 'failed',
                        data: fileObj.data,
                        error: err,
                    });
                } else {
                    sendJSON({
                        name: file_path,
                        status: 'success',
                        data: fileObj.data,
                        type: 'file',
                    });
                }
                fs.unlink(full_path + '~asv', function() {});
            });
        });
    }

    function hide(full_path, file_path) {
        fs.lstat(m_full_path, function(err, stat) {
            if(err) {
                errorResponse(err);
                return;
            }
            if(stat.isDirectory()) {
                rimraf(m_full_path, handle_result);
            } else {
                fs.unlink(m_full_path, handle_result);
            }
        });

        var handle_result = function(err) {
            if(err) {
                errorResponse(err);
            } else {
                sendJSON({
                    status: 'success',
                    name: file_path
                });
            }
        };
    }

    function renameFile(full_path, file_path, new_path){
        var new_full_path = path.join(path.dirname(full_path), path.basename(new_path));
        //console.log('renaming to ' + new_full_path)
        fs.exists(new_full_path, function(exists) {
            if(exists) {
                //TODO: what should we do in case we overwrite a file
                //shouldn't happen
            } else {
                fs.rename(full_path, new_full_path, function (err) {
                    if (err) {
                        errorResponse(err + ' file could not be renamed');
                    } else {
                        //console.log(path.join(path.dirname(full_path), path.basename(new_path)));
                        sendFile(new_full_path, new_path);
                    }
                });
            }
        });
    }

    function makeAutoSave(full_path, file_path, fileObj){
        var asv_full_path = full_path+'~asv';
        fs.writeFile(asv_full_path, fileObj.data, 'utf8', function(err) {
            if(err) {
                console.warn("Saving failed: " + err);
            }
        });
    }

    function getAutoSave(full_path, file_path, callback){
        var asv_full_path = full_path+'~asv';
        fs.readFile(asv_full_path, 'utf8', function(err, data) {
            if(err) {
                callback(false);
            } else {
                callback(data);
            }
        });
    }

    function renameBackup(full_path, new_full_path, callback){
        var bak_full_path = full_path + '~bak';
        var new_bak_full_path = new_full_path + '~bak';
        fs.exists(bak_full_path, function(exists){
            if(exists){
                fs.rename(bak_full_path, new_bak_full_path, function(err){
                    // ...
                });
            } else {
                //no need to rename
                callback(true);
            }
        });
    }

    function makeBackup(full_path, file_path, fileObj, callback){
        var bak_full_path = full_path + '~bak';
        fs.exists(full_path, function(exists) {
            if(exists) {
                fs.rename(full_path, bak_full_path, function(err) {
                    if(err) {
                        errorResponse(err);
                    }
                    else {
                        callback(exists);
                    }
                });
            } else {
                fs.writeFile(bak_full_path, fileObj.data, 'utf8', function(err) {
                    if(err){
                        errorResponse(err);
                    } else {
                        callback(exists);
                    }
                });
            }
        });
    }

    function getBackup(full_path, file_path, callback) {
        var bak_full_path = full_path + '~bak';
        fs.readFile(bak_full_path, 'utf8', function(err, data) {
            if(err) {
                callback(false);
            } else {
                callback(data);
            }
        });
    }

    function sendBackup(full_path, file_path){
        getBackup(full_path, file_path, function(data) {
            if(data) {
                if(file_path.substring(0,1) === '/')
                    file_path = file_path.substring(1);

                //console.log(file_path)
                sendJSON({
                    name: file_path,
                    backup: true,
                    data: data,
                    status: 'success',
                    type: 'file'
                });
            } else {
                errorResponse('could not find backup');
            }
        });
    }

    function create_user_path() {
        fs.mkdirSync(m_user_path,function(err) {
            if (err) errorResponse(err);
        });
    }
};
