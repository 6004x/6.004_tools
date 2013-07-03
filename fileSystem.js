var fileSystem= function(){
	var DEFAULT_SERVER;
	var server;
	var openFiles=[];
	var fileTree={};
	var updated=true;
	var online=false;
	var testFileTree={"dir1":{"cjtserver.js":[],"dir2":{"fileindir2.js":{"name":"//dir1/dir2/fileindir2.js","data":"this is another test file"}},"testfile.jsim":{"name":"//dir1/testfile.jsim","data":"this is a test file"}},"lab 3":{"lab3.bak":[],"lab3.jsim":[],"lab3.timing":[],"lab3.timing.bak":[],"lab3_beta.bak":[],"lab3_beta.jsim":[],"lab3_extra.bak":[],"lab3_extra.jsim":[]},"lab 6":{"alu":{"lab3.jsim":[],"mult.jsim":[]},"lab6 tests":{"lab6 individual tests":{"lab6basicblock.jsim":[],"lab6basicblock.uasm":[],"lab6ctl.jsim":[],"lab6pc.jsim":[],"lab6regfile.jsim":[]},"lab6.uasm":[],"lab6checkoff.jsim":[]},"lab6.bak":[],"lab6.jsim":[]},"test_file.js":[]}
	/*
		fileTree contains a tree representation of a file list, starting with the rootnode,
		and an dict to indicate all folders and files in the current node. In the dict, 
		if it is a subfolder, that dict node has an arraw representing the structure of 
		the subfolder, recursively. 
		if it is a file, it might have a file, if it has been opened in the editor
	*/
	/*
	*	each file will have 2 attributes:
		file.name (relative path of file)
		file.data (String representation of file 'utf8')

		TO IMPLEMENT:
		file.isOpen
		file.isSaved
	*
	*/

	//TODO: new folder, delete folder, delete items, version control


	var exports={};
	function getFileList(username, callback, callbackFailed){
		//using username or some other sort of authentication, we can get the root folder of the user
		console.log(Object.keys(fileTree).length);
		if(Object.keys(fileTree).length>0&&updated){
			return fileTree;
		}else if (!updated){
			fileTree=readTreeFromLocalStorage;
			writeLocalStorageToServer();
			return fileTree;
		}
		else if(username){
            sendAjaxRequest('/',null,'json',username, 'filelist', 
            	function(data, status){
	            	if(status=='success'){
	            		callback(data,status);
	            		fileTree=data;
	            		writeTreeToLocalStorage();
	            		updated=true;
	            		online=true;
	            	}
	            }
            , 	function(req, status, error){
	            	if(callbackFailed)
	            		callbackFailed(req, status, error);
	            	online=false;
	            	return readTreeFromLocalStorage;
            });	
            //callback will return with a file object
            console.log('request sent');
		}
	}
	function writeTreeToLocalStorage(){
		console.log('writing tree to local storage');
		localStorage.setItem('6004data', JSON.stringify(fileTree));
	}
	function readTreeFromLocalStorage(){
		var x= JSON.parse(localStorage.getItem('6004data'));
		console.log(x);
		return x;
	}
	function writeLocalStorageToServer(){
		//tobe implemented;
	}
	function getFile(username, fileName, callback, callbackFailed){
		//username or some sort of authentication
		var file= getFileFromTree(fileName);
		
		if(username&&!file){
			sendAjaxRequest(fileName,null, 'json', username, 'getFile', function(data, status){
				callback(data, status)
				if(statis=='success')
					writeFileToTree(data.name, data.data);
			}, callbackFailed);
		}else{
			return file;
		}
	}
	function getFileFromTree(fileName){
		var filePath=fileName.match(/\/(\w|\d|\.|\s)+/g);
		console.log(filePath);
		var followPath=fileTree;
		for(var i in filePath){
			followPath=followPath[filePath[i].slice(1)];
			console.log(followPath);
		}
		console.log(followPath);
		if(followPath.length==0)
			return false;
		//else there is a file
		return followPath[0];
	}
	function writeFileToTree(fileName, fileData){
		var filePath=fileName.match(/\/(\w|\d|\.|\s)+/g);
		console.log(filePath);
		var followPath=fileTree;
		for(var i in filePath){
			if(i==filePath.length-1){
				console.log(followPath);
				console.log(fileName+' being written');
				followPath[filePath[i].slice(1)]={name:fileName, data:fileData};
				console.log(followPath);
			}
			else{
				followPath=followPath[filePath[i].slice(1)];
			}
		}
		console.log(fileTree);
		console.log(fileName +' should now have a file attached to it')
		writeTreeToLocalStorage();
		return followPath;
	}


	function saveFile(username, file, callback, callbackFailed){
		sendAjaxRequest(file.name, file.data,'json', username, 'saveFile', function(data, status){
			callback(data, status);
			writeFileToTree(file.name, file.data);
			updated=false;
			console.log('saveFile successfull');
		}, callbackFailed);
		
	}

	function newFile(username, file, callback, callbackFailed){
		sendAjaxRequest(file.name, file.data,'json', username, 'newFile', callback, callbackFailed);
	}	
	function newFolder(username, folderName, callback, callbackFailed){
		sendAjaxRequest(folderName,null,'json', username, 'newFolder', callback, callbackFailed);
	}	

	function sendAjaxRequest(filepath, fileData, dataType, username, query, callbackFunction, failFunction){
		failFunction=failFunction||failResponse

        if(!fileData)
            fileData='none';

        console.log(fileData);
        console.log(username);
        url=server+'/'+filepath;

        var req=$.ajax({
                url:url, 
                data:{dummy:'dummy', username:username,query:query, fdata:fileData},
                username:username,
                dataType:dataType,
            });
        req.done(function(data, status){
        	console.log(data);
        	console.log('returned from server');
        	callbackFunction(data, status);
        });
        req.fail(failFunction);
        req.always(function(request, status){
                console.log(status);
        });
    }
    function failResponse(req, status, error){
        alert('failed response '+status+' '+error);
    }

    exports.getFileList=getFileList;
    exports.getFile=getFile;
    exports.saveFile=saveFile;
    exports.newFile=newFile;
    exports.newFolder=newFolder;

    exports.getServerName=function(){return DEFAULT_SERVER;};

    function setup(serverN){
    	server=DEFAULT_SERVER||serverN;
    	console.log(server);
    }
    exports.setup=setup;
    exports.getFileFromTree=getFileFromTree;
    return exports;
}();