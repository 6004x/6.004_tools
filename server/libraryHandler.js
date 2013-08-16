var url=require('url');
var qs = require('querystring');
var fs = require('fs');
var path=require('path');

(function() {
    var libraryHandler = function(request, response, postData){
    	var root_path = 	process.cwd();//__dirname
		//current directory will hold all user files in /libraries
		var lib_path = path.join(root_path, 'libraries'); 
		var m_user_path, m_full_path, m_shared_path, m_shared_full_path;

		var m_file_path = unescape(url.parse(request.url).pathname);

		var user = request.user;
		var query = String(postData['query']);
		// console.log(data);
		// console.log(root_path);
		// console.log(request.url);
		// console.log(m_file_path);
		if(user){
			m_user_path = path.join(lib_path, user);
			m_shared_path = path.join(root_path, 'shared')
			m_full_path = path.join(m_user_path, m_file_path);
			m_shared_full_path = path.join(m_shared_path, m_file_path);
			console.log(m_user_path)
		}
		if(!fs.existsSync(m_user_path))
			create_user_path()
		console.log(user + ' wants ' + query);
		console.log('directory: ' + m_full_path)

		fs.exists(m_full_path, function(exists){
			try{
				functions[query](exists);
			} catch(e) {
				errorResponse(e);
			}
		});

		var functions  = {
			getUser:function(exists){
				sendJSON({user:user});
			},
			getFile:function(exists){
				console.log('file path is '+ m_full_path);
				if (!exists) {
					// it's not in user's directory, try shared directory
					fs.exists(m_shared_full_path,function(exists) {
						if (exists){
							fs.readFile(shared_full_path, 'utf8', function(err,data){
								if(err){
									errorResponse(err)
								} else {
									console.log('reading shared file ' + data.name)
									saveFile(m_full_path, m_file_path, data.data);
									console.log('and saving to the user folder')
								}
							});
						}
						else {
						// library not found, send empty one
							errorResponse('could not find the file');
						}
					});
				}
				else{
					console.log('sendFile');
					if(!fs.lstatSync(m_full_path).isDirectory())
						sendFile(m_full_path, m_file_path);
					else{
						errorResponse('the file that you are speaking of does not exist');
					}   
				}
			},
			getFileList : function(exists){
				console.log('file path is '+ m_full_path);
				if (!exists) {
					errorResponse('could not find the directory');
					//should never really happen
				}
				else{
					var fileList = recurseThroughFolders(m_full_path, '');
					console.log('returned from fileList');
					sendJSON({
						user:user,
						data:fileList
					});
				}
			}, 

			saveFile : function(exists){
				var fdata = postData.data;
				fs.exists(path.dirname(m_full_path), function(parent_exists){
					if(parent_exists){
						if(!exists){
							saveFile(m_full_path, m_file_path, fdata);
						}
						else{
							//merge? overwrite changes?
							saveFile(m_full_path, m_file_path, fdata);
						}
					}
					else {
						console.log('path of file does not exist');
						var pathdiff=path.relative(m_full_path, m_user_path);
						console.log(pathdiff);
						console.log(m_full_path);
						//do something with patthdiff...
						fs.mkdir(path.dirname(m_full_path), function(err){
							if(err){
								console.log(err);
								errorResponse(err + ' could not make directory');
								// sendJSON({name:m_file_path,status:'failed',error:err})
							} else {
								saveFile(m_full_path,m_file_path, fdata);
							}
						});
					}
				});
			},
			newFolder : function(exists){
				if(exists){
					errorResponse('path already exists at '+ m_file_path);
				}else{
					console.log('mkdir path');
					fs.mkdir(m_full_path, function(err){
						if(err){
							console.log(err);
							errorResponse(err+' path could not be made')
						} else {
							sendJSON({user_path:m_user_path, status:'success'});
						}
					});
				}
			},
			deleteFile : function(exists){
				if(exists){
					hide(m_full_path, m_file_path);
				} else { //doesn't exists
					errorResponse(m_file_path +' does not exist');
				}
			},
			renameFile : function(exists){
				if(exists){
					rename(m_full_path, m_file_path, String(postData.data));
				} else {
					errorResponse(m_file_path + ' does not exist')
				}
			},
			getRelative : function(exists){
				if(exists){
					var rel_path = postData.data;
					console.log(rel_path);
					var new_path = (path.join(path.dirname(m_file_path), rel_path));
					var new_full_path = (path.join(m_user_path, new_path));
					console.log('new_path');
					console.log(new_full_path)
					sendFile(new_full_path, rel_path);
				} else {
					console.log(postData.data)
					errorResponse( m_file_path + 'does not exist')
				}
			}
		}

		function recurseThroughFolders(curr_path, user_path){
			//console.log(curr_path);
			var files = fs.readdirSync(curr_path);
			var contentType = {};
			var fileList = {
				'path' : user_path,
				'type' : 'folder',
				'folders' : {},
				'files' : {},
				'name' : user,
			};
			for(var i=0; i < files.length; i++){
				var name = files[i];
				var new_curr_path = path.join(curr_path, name);
				var new_user_path = user_path + name;
				if(name.indexOf('~') < 0){

					if(fs.lstatSync(new_curr_path).isDirectory()){
						new_user_path += '\/';
						fileList.folders[name] = (recurseThroughFolders(new_curr_path, new_user_path));
						fileList.folders[name].name = name;
						for(var type in fileList.folders[name].contentType){
							if(contentType[type] == null)
								contentType[type] = 0;
							contentType[type] += fileList.folders[name].contentType[type];
						}

					} else {
						var type = name.split('.').pop();
						fileList.files[name] = ({
							'type' : 'file',
							'path' : new_user_path,
							'name' : name,
						});
						if(contentType[type] == null)
							contentType[type] = 1;
						else
							contentType[type]++;
					}
				} else {
					console.log(name +' is a deleted file, folder, or backed up');
				}
			}
			fileList['contentType'] = contentType;
			return(fileList);
		}

		function errorResponse(string){
			console.log(string)
			response.writeHeader(404, 
				{
					"Content-Type": "text/plain",
					"Access-Control-Allow-Origin":'*'
				});
			response.write('error: '+string);
			response.end();
		}
		
		function sendJSON(data) {
			var sdata = JSON.stringify(data);
			response.writeHead(200,{
				'Content-Length': sdata.length,
				'Content-Type': 'application/json',
				"Access-Control-Allow-Origin":'*'
			});
			response.end(sdata);
			console.log('data sent');
		}
		function sendFile(full_path, file_path) {
			postData.user = user;
			fs.readFile(full_path, 'utf8', function(err,data) {
				if (err){
					console.log(err);
					errorResponse(err+' file could not be read');
				}
				if(file_path.substring(0,1) === '/')
					file_path = file_path.substring(1);
				console.log(file_path)
				sendJSON({
					name:file_path,
					data:data,
					status:'success',
					type:'file',
				});
			});
		}
		function saveFile(full_path, file_path, fdata) {
			fs.writeFile(full_path, fdata, 'utf8', function (err) {
					if (err){
						console.log(err);
						sendJSON({
							name:file_path,
							status:'failed',
							data:fdata,
							error:err,
						});
					}
					else {
						console.log(file_path+ ' saved!');
						sendJSON({
							name:file_path,
							status:'success',
							data:fdata,
							type:'file',
						});
					}
			});
		}
		function hide(full_path, file_path){
			var hide_path = path.dirname(full_path)+path.sep+'del~'+path.basename(full_path)
			console.log('hiding '+hide_path);
			fs.exists(hide_path, function(exists){
				
				if(exists){
					//TODO: what should we do in case we delete a file/folder twice
					fs.unlinkSync(hide_path)
					console.log('exists');
				}
					fs.rename(full_path, hide_path, function (err) {
						if (err) {
							errorResponse(err + ' file could not be renamed');
							return;
						}
						else{
							console.log(path.sep+'del~'+path.basename(full_path));
							sendJSON({
								status:'success',
								name:file_path,
							});
						}
					});

			})
		}
		function rename(full_path, file_path, new_path){
			var new_full_path = path.join(path.dirname(full_path), path.basename(new_path));
			console.log('renaming to ' + new_full_path)
			fs.exists(new_full_path, function(exists){
				if(exists){
					//TODO: what should we do in case we overwrite a file
					//shouldn't happen
				}
				else{
					fs.rename(full_path, new_full_path, function (err) {
						if (err) {
							errorResponse(err + ' file could not be renamed');
							return;
						}
						else{
							console.log(path.join(path.dirname(full_path), path.basename(new_path)));
							sendFile(new_full_path, new_path);
						}
					});
				}

			})
		}
		function create_user_path() {
			fs.mkdirSync(m_user_path,function(err) {
				if (err) errorResponse(err);
			});
		}
	}

    module.exports.getLibraryHandler = function(request, response, data) {
        return libraryHandler(request, response, data);
    }

}());
