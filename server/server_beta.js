var sys = require('sys');
var url=require('url');
var qs = require('querystring');
var fs = require('fs');
var path=require('path');

http_server = require("http");

http_server.createServer(function(request,response){

	if (request.method == 'POST') {
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
			pathWorks(request, response, POST);
		});
		console.log(body);

	}
}).listen(8080);


function pathWorks(request, response, data){
	var root_path=process.cwd();//__dirname
	var lib_path=path.join(root_path, 'libraries');
	var user_path, full_path, shared_path;

	var file_path = unescape(url.parse(request.url).pathname);

	var user=data['username'];
	var query=String(data['query']);
	// console.log(data);
	// console.log(root_path);
	// sys.puts(request.url);
	// sys.puts(file_path);

	if(user){
		user_path=path.join(lib_path, user);
		shared_path=path.join(lib_path, 'shared')
		full_path=path.join(user_path,file_path);
	}
	
	sys.puts(user + ' wants ' + query);

	if(query==='getFile'||query==='filelist'){
		console.log('file path is '+ full_path);
		fs.exists(full_path, function(exists){
			if (!exists) {
				if(query==='getFile'){
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
				else
					errorResponse('could not find the file');
			}
			else{
				if(query==='filelist'){
					// no file name, return directory listing
					var fileList=recurseThroughFolders(full_path);
					console.log('returned from fileList');
					sendJSON(fileList);
				}
				else if (query==='getFile'){
					console.log(full_path);
					console.log('sendFile');
					if(!fs.lstatSync(full_path).isDirectory())
						sendFile(file_path, full_path);
					else{
						errorResponse('the file that you are speaking of does not exist');
					}   
				}
			}
		});
	}
	else if (query=='saveFile'||query=='newFile'){

		var fdata=data['fdata'];
		fs.exists(path.dirname(full_path), function(exists){
			if(exists){
				fs.exists(full_path, function(exists){
					if(!exists){
						saveFile(file_path, full_path, fdata);
					}
					else{
						//merge? overwrite changes?
						saveFile(file_path, full_path, fdata);
					}
					
				});
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
						sendJSON({name:file_path,status:'failed',error:err})
					} else {
						saveFile(file_path, full_path, fdata);
					}
				});
			}
		});
	} else if (query=='newFolder'){
		fs.exists((full_path), function(exists){
			if(exists){
				errorResponse('path already exists at '+ file_path);
			}else{
				console.log('mkdir path');
				fs.mkdir((full_path), function(err){
					if(err){
						console.log(err);
						errorResponse(err+' path could not be made')
					} else {
						console.log('didn\'t fail');
						sendJSON({user_path:user_path, status:'success'});
					}
				});
			}
		});
		} else if (query=='deleteFile'){
			fs.exists((full_path), function(exists){
				if(exists){
					hideFile(full_path, file_path);
				} else { //doesn't exists
					errorResponse(file_path +' does not exist');
				}
			});
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
					sys.puts(err);
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
			console.log('hiding '+path.dirname(full_path)+path.sep+path.basename(full_path));
			fs.rename(full_path, path.dirname(full_path)+path.sep+'del~'+path.basename(full_path), function (err) {
				if (err) 
					errorResponse(err + ' file could not be renamed');
				
				console.log(file_path+'~del');
				sendJSON({
					status:'success',
					name:file_path,
				});
		});
		}
		function create_user_path() {
			fs.exists(user_path,function(exists) {
			if (!exists)
				fs.mkdir(user_path,function(err) {
						if (err) throw(err);
						// after();
					});
			// after();
			});
		}
}
sys.puts("Server Running on 8080");