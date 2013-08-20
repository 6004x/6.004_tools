var url=require('url');
var qs = require('querystring');
var fs = require('fs');
var path=require('path');

(function() {
    var libraryHandler = function(request, response, postData){
    	var root_path = process.cwd();//__dirname
		//current directory will hold all user files in /libraries
		var lib_path = path.join(root_path, 'libraries'); 
		//other relevant paths to be instantiated as the user logs in.
		var m_user_path, m_full_path, m_shared_path, m_shared_full_path;

		var m_file_path = unescape(url.parse(request.url).pathname);

		var user = request.user;
		var query = String(postData.query);
		var fileObj = {};
		var otherFileObj = {};
		//since qs only does up to one level of objects, we need to add another level
		//for fileObj and otherFileObj
		for(var key in postData){
			if(key.indexOf('fileObj') !== -1){
				var newKey = key.substring(key.indexOf('[') + 1, key.indexOf(']'));
				fileObj[newKey] = postData[key];
			} else if(key.indexOf('otherFileObj') !== -1){
				var newKey = key.substring(key.indexOf('[') + 1, key.indexOf(']'));
				otherFileObj[newKey] = postData[key];
			} else {
				//no other object should be more than one level down.
			}
		}
		console.log(fileObj)
		var fileData = fileObj.data;

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
		var full_dir_name = path.dirname(m_full_path);
		var user_dir_name = path.dirname(m_file_path);
		var file_name = path.basename(m_file_path);

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
									saveFile(m_full_path, m_file_path, fileObj);
									// console.log('and saving to the user folder')
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
					fs.lstat(m_full_path, function(err, stats){
						if(stats.isDirectory()){
							errorResponse('the file is a folder, oops for you')
						} else {
							getAutoSave(m_full_path, m_file_path, function(asv_data){
								var saveAndBackup = {}
								if(asv_data){
									saveAndBackup.autosave = asv_data;
								}
								// getBackup(m_full_path, m_file_path, function(bak_data){
								// 	if(bak_data){
								// 		saveAndBackup.backup = bak_data;
								// 	}
									sendFile(m_full_path, m_file_path, saveAndBackup);
								// });
							});
						}
					})

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
				
				fs.exists(path.dirname(m_full_path), function(parent_exists){
					//making sure the directory exists...
					if(parent_exists){

						if(!exists){
							//if directory exists, and file doesn't exist, just make the file. 
							saveFile(m_full_path, m_file_path, fileObj);
							makeAutoSave(m_full_path, m_file_path, fileObj);
						}
						else{
							//if the file exists, rename to a backup
							makeBackup(m_full_path, m_file_path, fileObj, function(data){
								saveFile(m_full_path, m_file_path, fileObj);
								makeAutoSave(m_full_path, m_file_path, fileObj);
							})
						}
					}
					else {
						console.log('path of file does not exist');
						var pathdiff = path.relative(m_full_path, m_user_path);
						console.log(pathdiff);
						console.log(m_full_path);
						//do something with patthdiff...
						fs.mkdir(path.dirname(m_full_path), function(err){
							if(err){
								console.log(err);
								errorResponse(err + ' could not make directory');
							} else {
								saveFile(m_full_path,m_file_path, fileObj);
							}
						});
					}
				});
			},
			autoSaveFile : function(exists){
				//AutoSaVe file
					makeAutoSave(m_full_path, m_file_path, fileObj);
					sendJSON({name:m_file_path, data:fileData});
			},
			getAutoSave : function(exists){
				sendAutoSave(full_path, file_path)
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
					rename(m_full_path, m_file_path, otherFileObj.name);
				} else {
					errorResponse(m_file_path + ' does not exist')
				}
			},
			getRelative : function(exists){
				if(exists){
					var rel_path = otherFileObj.name;
					console.log(rel_path);
					var new_path = (path.join(path.dirname(m_file_path), rel_path));
					var new_full_path = (path.join(m_user_path, new_path));
					console.log('new_path');
					console.log(new_full_path)
					sendFile(new_full_path, rel_path);
				} else {
					console.log(otherFileObj.name)
					errorResponse( m_file_path + 'does not exist')
				}
			},
			getBackup : function(exists){
				if(exists){
					sendBackup(m_full_path, m_file_path);
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
		function sendFile(full_path, file_path, saveAndBackup) {
			fs.readFile(full_path, 'utf8', function(err,data) {
				if (err){
					console.log(err);
					errorResponse(err+' file could not be read');
				}
				if(file_path.substring(0,1) === '/')
					file_path = file_path.substring(1);
				console.log(file_path)
				var fileSend = {
					name:file_path,
					data:data,
					status:'success',
					type:'file',
				}
				if(saveAndBackup.autosave){
					fileSend.autosave = true;
					fileSend.autosaveFile = saveAndBackup.autosaveFile
				}
				if(saveAndBackup.backup){
					fileSend.backup = true;
					fileSend.backupFile = saveAndBackup.backupFile
				}
				sendJSON(fileSend);
			});
		}
		function saveFile(full_path, file_path, fileObj) {
			fs.writeFile(full_path, fileObj.data, 'utf8', function (err) {
					if (err){
						console.log(err);
						errorResponse({
							name:file_path,
							status:'failed',
							data:fileObj.data,
							error:err,
						});
					}
					else {
						writeMetaData(full_path, fileObj);
						console.log(file_path+ ' saved!');
						sendJSON({
							name:file_path,
							status:'success',
							data:fileObj.data,
							type:'file',
						});
					}
			});
		}
		function hide(full_path, file_path){
			var hide_path = full_path + '~del';
			console.log('hiding '+hide_path);
			fs.exists(hide_path, function(exists){
				
				if(exists){
					//TODO: what should we do in case we delete a file/folder twice
					fs.unlink(hide_path, renameToHide)
					console.log('exists');
				}
				else
					renameToHide();
				function renameToHide(err){
					if(err)
						errorResponse(err)
					else{
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
					}
				}
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
		function makeAutoSave(full_path, file_path, fileObj){
			var asv_full_path = full_path+'~asv';
			fs.writeFile(asv_full_path, fileObj.data, 'utf8', function(err){
				if(err)
					console.log(err)
				else {
					//writeMetaData(asv_full_path, fileObj);
					console.log('autosaved ' + file_path);
				}

			})
		}

		function getAutoSave(full_path, file_path, callback){
			var asv_full_path = full_path+'~asv';
			fs.readFile(asv_full_path, 'utf8', function(err, data){
				if(err){
					callback(false);
				}
				else{
					callback(data);
				}
			});
		}
		function sendAutoSave(full_path, file_path){
			getAutoSave(full_path, file_path, function(){
				if(file_path.substring(0,1) === '/')
					file_path = file_path.substring(1);
				console.log(file_path)
				sendJSON({
					name : file_path,
					autosave : true,
					data : data,
					status : 'success',
					type : 'file',
				});
			
			})
		}
		function makeBackup(full_path, file_path, fileObj, callback){
			var bak_full_path = full_path + '~bak'
			fs.exists(full_path, function(exists){
				if(exists){
					fs.rename(full_path, bak_full_path, function(err){
						if(err){
							errorResponse(err)
						}
						else {
							//writeMetaData(bak_full_path, fileObj)
							console.log('backup ' + file_path);
							callback(exists)
						}
					})
				} else {
					fs.writeFile(bak_full_path, fileObj.data, 'utf8', function(err){
						if(err){
							errorResponse(err)
						} else {
							callback(exists)
						}
					});
				}
			});
		}
		function getBackup(full_path, file_path, callback){
			var bak_full_path = full_path + '~bak'
			fs.readFile(bak_full_path, 'utf8', function(err, data){
				if(err)
					callback(false)
				else{
					callback(data)
				}
			})
		}
		function sendBackup(full_path, file_path){
			getBackup(full_path, file_path, function(data){
				if(data){
					if(file_path.substring(0,1) === '/')
						file_path = file_path.substring(1);
					console.log(file_path)
					sendJSON({
						name : file_path,
						backup: true,
						data: data,
						status: 'success',
						type: 'file',
					})
					/*getMetaData(full_path, function(obj){
						obj.name = file_path;
						obj.backup = true;
						obj.data = data;
						obj.status = 'success'
						obj.type = 'file';
						sendJSON(obj);
					})*/
				}
				else {
					errorResponse('could not find backup');
				}			
			})
		}
		function writeMetaData(full_path, metadata){
			var met_full_path = full_path + '~met';
			var parsedMetadata = {};
			for (var key in metadata){
				if(key !== 'content' && key !== 'data')
					parsedMetadata[key] = metadata[key];
			}
			fs.writeFile(met_full_path, JSON.stringify(parsedMetadata), 'utf8', function(err){
				if(err) errorResponse(err);
				else console.log(parsedMetadata + 'saved')

			})
		}
		function getMetaData(full_path, callback){
			var met_full_path = full_path + '~met';
			fs.readFile(met_full_path, 'utf8', function(err, data){
				if(err){
					//no metadata file
					fs.writeFile(met_full_path, '', 'utf8', function(err, data){
						if (err){
							errorResponse(err)
						} else {
							callback({});
						}
					})
				}
				else {
					callback(JSON.parse(data));
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
