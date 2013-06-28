var fileSystem= function(){
	var DEFAULT_SERVER;
	var openFiles=[];
	var fileTree={};
	
	/*
		fileTree contains a tree representation of a file list, starting with the rootnode,
		and an dict to indicate all folders and files in the current node. In the dict, 
		if it is a subfolder, that dict node has an arraw representing the structure of 
		the subfolder, recursively. 
		if it is a file, it will not have a subtree
	*/
	/*
	*	each file will have 4 attributes:
		file.name (relative path of file)
		file.data (String representation of file 'utf8')
		file.isOpen
		file.isSaved
	*
	*/

	var exports={};
	function getFileList(username, callback, callbackFailed){
		//using username or some other sort of authentication, we can get the root folder of the user
		
		if(username){
            sendAjaxRequest('/',null,'json',username, 'filelist', callback, callbackFailed);
            //callback will return with a file object
		}
	}
	function getFile(username, fileName	, callback){
		//username or some sort of authentication
		if(username){
			sendAjaxRequest(fileName,null, 'json', username, 'getFile', callback);
		}
	}
	function saveFile(username, file, callback){
		sendAjaxRequest(file.name, file.data,'json', username, 'saveFile', callback);

	}
	function sendAjaxRequest(filepath, fileData, dataType, username, query, callbackFunction, failFunction, urlparam){
		failFunction=failFunction||failResponse
        url=DEFAULT_SERVER||urlparam; //default server

        if(!fileData)
            fileData='none';

        console.log(fileData);
        console.log(username);
        url+=filepath;

        var req=$.ajax({
                url:url, 
                data:{dummy:'dummy', username:username,query:query, fdata:fileData},
                username:username,
                dataType:dataType,
            });
        req.done(callbackFunction);
        req.fail(failFunction);
        req.always(function(r, status){
                //var func = JSON.parse(r);
                console.log(status);
        });
    }
    function failResponse(req, status, error){
        alert('failed response '+status+'<br> '+error);
    }

    exports.getFileList=getFileList;
    exports.getFile=getFile;
    exports.saveFile=saveFile;

    function setup(server){
    	DEFAULT_SERVER=server;
    }
    exports.setup=setup;
    return exports;
}();