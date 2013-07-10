var FileSystem= function(){
    var DEFAULT_SERVER;
    var mServer;
    var mUsername;

    var files=[];
    var fileTree={};

    var updated=true;
    var online=false;

    /*
        fileTree contains a tree representation of a file list, starting with the rootnode,
        and an dict to indicate all folders and files in the current node. In the dict, 
        if it is a subfolder, that dict node has an arraw representing the structure of 
        the subfolder, recursively. 
        if it is a file, it might have a file, it if has been opened in the editor
    */
    /*
    *   each file will have 2 attributes:
        file.name (relative path of file
)       file.data (String representation of file 'utf8')

        TO IMPLEMENT:
        file.isOpen
        file.onServer
    *
    */

    //TODO: delete folder, delete items, version control


    var exports={};
    function getFileList(callback, callbackFailed){
        //using username or some other sort of authentication, we can get the root folder of the user
        if(fileTree)
            console.log(Object.keys(fileTree).length);
        // if(Object.keys(fileTree).length>0&&updated){
        //  return fileTree;
        // }else if (!updated){
        //  fileTree=readTreeFromLocalStorage;
        //  writeLocalStorageToServer();
        //  return fileTree;
        // }
        if(mUsername){
            sendAjaxRequest('/',null,'json', 'filelist',
                function(data, status){
                    console.log(data);
                    console.log(status);
                    if(status=='success'){
                        
                        console.log('callback in filesys')
                        fileTree=data;
                        writeTreeToLocalStorage();
                        updated=true;
                        online=true;
                        callback(data);
                    }
                }
            ,   function(req, status, error){
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

        //var savedTree=traverseTree()
        for(var i=0; i<files.length; i++){
            var file = traverseTree(files[i], function(i, file, pathname, pathlength){
                console.log('6004file'+pathname);
                //localStorage.setItem('6004file'+pathname, JSON.stringify(fileTree));    

                return true;
            });
            localStorage.setItem('6004file'+files[i], JSON.stringify(file));
        }
        localStorage.setItem('6004data', JSON.stringify(fileTree));    
        
    }
    function readTreeFromLocalStorage(){
        //todo make it asynchronous
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
                if(status=='success'){
                    callback(data);
                    writeFileToTree(data.name, data.data, true);
                }
            }, callbackFailed);
        }else if (file){
            getFileFromTree[onServer]=false;
            return callback(file, 'success');
        } else {
            alert('file could not be retrieved')
        }
    }
    
    function traverseTree(fileName, action){
        var filePath=fileName.match(/(\w|\d|\.|\s)+/g);
        console.log(filePath);
        var followPath=fileTree;
        for(var i in filePath){

            // action function of 3 variables, the index, the current path, and the length
            // of the whole filepath. 
            // returns true if we can continue
            if(action(i, followPath, filePath[i], filePath.length))
                followPath=followPath[filePath[i]];//.slice(1)];
        }
        return followPath;
    }
    function getFileFromTree(fileName){
        var finalTree=traverseTree(fileName, function(i, tree){console.log(tree); return true;} );

        if(finalTree.length==0)
            return false;
        //else there is a file
        return finalTree[0];
    }
    function writeFileToTree(fileName, fileData, onServer){
        var finalTree=traverseTree(fileName, function(i, followPath, currentPath, length){
            if(i==length-1){
                console.log(followPath);
                console.log(fileName+' being written');
                followPath[currentPath]={name:fileName, data:fileData, onServer:onServer};
                console.log(followPath);
                return false;
            }
            return true;
        });
        files.push(fileName);
        console.log(fileTree);
        console.log(finalTree);console.log(' should now have a file attached to it')
        writeTreeToLocalStorage();
        return finalTree;
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

    function sendAjaxRequest(filePath, fileData, dataType, query, callbackFunction, failFunction){
        failFunction=failFunction||failResponse

        if(!fileData)
            fileData='none';

        console.log(filePath);
        console.log('path passed to ajax request');
        url=mServer+filePath;

        var req=$.ajax({
                type:"POST",
                url:url, 
                data:{dummy:'dummy', username:mUsername, query:query, fname:filePath, fdata:fileData},
                username:mUsername,
                dataType:dataType,
            });
        req.done(function(data, status){
            console.log(status);
            console.log('returned from server');
            //check if status is successful
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