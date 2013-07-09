var FileSystem= function(){
	var DEFAULT_SERVER;
	var mServer;
	var mUsername;

	var openFiles=[];
	var fileTree={};

	var updated=true;
	var online=false;

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

	//TODO: delete folder, delete items, version control


	var exports={};
	function getFileList(callback, callbackFailed){
		//using username or some other sort of authentication, we can get the root folder of the user
		if(fileTree)
			console.log(Object.keys(fileTree).length);
		// if(Object.keys(fileTree).length>0&&updated){
		// 	return fileTree;
		// }else if (!updated){
		// 	fileTree=readTreeFromLocalStorage;
		// 	writeLocalStorageToServer();
		// 	return fileTree;
		// }
		if(mUsername){
            sendAjaxRequest('/',null,'json', 'filelist', 
            	function(data, status){
	            	if(status=='success'){
	            		
	            		fileTree=data;
	            		writeTreeToLocalStorage();
	            		updated=true;
	            		online=true;
	            		callback(data,status);
	            	}
	            }
            , 	function(req, status, error){
	            	if(callbackFailed)
	            		callbackFailed(req, status, error);
	            	online=false;
	            	//return readTreeFromLocalStorage();
            });	
            //callback will return with a file object
            console.log('request sent');
		}
	}
	function writeTreeToLocalStorage(){
		console.log('writing tree to local storage');

		//todo, divide up the data, make it asynchronous
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
	function getFile(fileName, callback, callbackFailed){
		//username or some sort of authentication
		var file= getFileFromTree(fileName);
		
		if(online){
			sendAjaxRequest(fileName,null, 'json', 'getFile', function(data, status){
				callback(data, status)
				if(status=='success')
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


	function saveFile(file, callback, callbackFailed){
		sendAjaxRequest(file.name, file.data,'json', 'saveFile', function(data, status){
			callback(data, status);
			writeFileToTree(file.name, file.data);
			updated=false;
			console.log('saveFile successfull');
		}, callbackFailed);
		
	}

	function newFile(file, callback, callbackFailed){
		sendAjaxRequest(file.name, file.data,'json', 'newFile', callback, callbackFailed);
		updated=false;
	}	
	function newFolder(folderName, callback, callbackFailed){
		sendAjaxRequest(folderName,null,'json', 'newFolder', callback, callbackFailed);
		updated=false;
	}	

	function sendAjaxRequest(filepath, fileData, dataType, query, callbackFunction, failFunction){
		failFunction=failFunction||failResponse

        if(!fileData)
            fileData='none';

        console.log(fileData);
        console.log(mUsername);
        url=mServer+'/'+filepath;

        var req=$.ajax({
        		type:"POST",
                url:url, 
                data:{dummy:'dummy', username:mUsername, query:query, fdata:fileData},
                username:mUsername,
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

    exports.getServerName=function(){return mServer;};
    exports.getUserName=function(){return mUsername;};

    function setup(username, server){
    	mServer=server||DEFAULT_SERVER;
    	mUsername=username;
    	console.log(mServer);
    }

    exports.setup=setup;
    exports.getFileFromTree=getFileFromTree;

    return exports;
}();