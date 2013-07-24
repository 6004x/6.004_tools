var url=require('url');
var qs = require('querystring');
var fs = require('fs');
var path=require('path');

(function() {
    var libraryHandler = function(request, response, data){
    	var root_path=process.cwd();//__dirname
		//current directory will hold all user files in /libraries
		var lib_path=path.join(root_path, 'libraries'); 
		var user_path, full_path, shared_path;

		var file_path = unescape(url.parse(request.url).pathname);

		var user=request.user;
		var query=String(data['query']);
		// console.log(data);
		// console.log(root_path);
		// console.log(request.url);
		// console.log(file_path);
		if(user){
			user_path=path.join(lib_path, user);
			shared_path=path.join(lib_path, 'shared')
			full_path=path.join(user_path,file_path);
			console.log(user_path)
		}
		if(!fs.existsSync(user_path))
			create_user_path()
		console.log(user + ' wants ' + query);

		fs.exists(full_path, function(exists){
			functions[query](exists);
		});

		var functions  = {
			getUser:function(exists){
				sendJSON({user:user});
			},
			getFile:function(exists){
				console.log('file path is '+ full_path);
				if (!exists) {
					// it's not in user's directory, try shared directory
					shared_file = path.join(shared_path, file_path);
					fs.exists(shared_file,function(exists) {
						if (exists) 
							sendFile(shared_file);
						else {
						// library not found, send empty one
							errorResponse('could not find the file');
						}
					});
				}
				else{
					console.log(full_path);
					console.log('sendFile');
					if(!fs.lstatSync(full_path).isDirectory())
						sendFile(file_path, full_path);
					else{
						errorResponse('the file that you are speaking of does not exist');
					}   
				}
			},
			getFileList : function(exists){
				console.log('file path is '+ full_path);
				if (!exists) {
					errorResponse('could not find the directory');
					//should never really happen
				}
				else{
					var fileList=recurseThroughFolders(full_path);
					console.log('returned from fileList');
					sendJSON({user:user, data:fileList});
				}
			}, 

			saveFile : function(exists){
				var fdata=data['fdata'];
				fs.exists(path.dirname(full_path), function(parent_exists){
					if(parent_exists){
						if(!exists){
							saveFile(file_path, full_path, fdata);
						}
						else{
							//merge? overwrite changes?
							saveFile(file_path, full_path, fdata);
						}
					}
					else {
						console.log('path of file does not exist');
						var pathdiff=path.relative(full_path, user_path);
						console.log(pathdiff);
						console.log(full_path);
						//do something with patthdiff...
						fs.mkdir(path.dirname(full_path), function(err){
							if(err){
								console.log(err);
								errorResponse(err + ' could not make directory');
								// sendJSON({name:file_path,status:'failed',error:err})
							} else {
								saveFile(file_path, full_path, fdata);
							}
						});
					}
				});
			},
			newFile : function(exists){

			}, 
			newFolder : function(exists){
				if(exists){
					errorResponse('path already exists at '+ file_path);
				}else{
					console.log('mkdir path');
					fs.mkdir((full_path), function(err){
						if(err){
							console.log(err);
							errorResponse(err+' path could not be made')
						} else {
							sendJSON({user_path:user_path, status:'success'});
						}
					});
				}
			},
			deleteFile : function(exists){
				if(exists){
					hideFile(full_path, file_path);
				} else { //doesn't exists
					errorResponse(file_path +' does not exist');
				}
			},
		}

		function recurseThroughFolders(curr_path){
			//console.log(curr_path);
			var files=fs.readdirSync(curr_path);
			var fileList={};
			for(var i=0; i <files.length; i++){
				var name = files[i];
				var new_path=path.join(curr_path, name);
				if(name.indexOf('~')<0){
					if(fs.lstatSync(new_path).isDirectory()){
						fileList[name]= recurseThroughFolders(new_path);
				//synchronois return of list of subfiles, only need to go one level down
					} else {
						fileList[name]=[];
					}
				} else {
					console.log(name +' is a deleted file, folder, or backed up');
				}
			}
			return(fileList);
		}

		function errorResponse(string){
			response.writeHeader(404, 
				{
					"Content-Type": "text/plain",
					"Access-Control-Allow-Origin":'*'
				});
			response.write('error: '+string);
			response.end();
		}
		
		function sendJSON(data) {
			var sdata= JSON.stringify(data);
			response.writeHead(200,{
				'Content-Length': sdata.length,
				'Content-Type': 'application/json',
				"Access-Control-Allow-Origin":'*'
			});
			response.end(sdata);
			console.log('data sent');
		}
		function sendFile(file_path, full_path) {
			data.user = user;
			fs.readFile(full_path,'utf8',function(err,data) {
				if (err){
					console.log(err);
					errorResponse(err+' file could not be read');
				}
				sendJSON({
					name:file_path,
					data:data,
					status:'success',
				});
			});
		}
		function saveFile(file_path, full_path, fdata) {
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
						});
					}
			});
		}
		function hideFile(full_path, file_path){
			console.log('hiding '+path.dirname(full_path)+path.sep+'~'+path.basename(full_path));
			fs.rename(full_path, path.dirname(full_path)+path.sep+'del~'+path.basename(full_path), function (err) {
				if (err) 
					errorResponse(err + ' file could not be renamed');
				
				console.log(path.sep+'del~'+path.basename(full_path));
				sendJSON({
					status:'success',
					name:file_path,
				});
			});
		}
		function create_user_path() {
			fs.mkdirSync(user_path,function(err) {
				if (err) throw(err);
				// after();
			});
		}
	}

    module.exports.getLibraryHandler = function(request, response, data) {
        return libraryHandler(request, response, data);
    }

}());
