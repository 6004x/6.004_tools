var FileSystem= function(){
    var DEFAULT_SERVER;
    var mServer;
    var mUsername;

    var openFiles=[];
    var allFiles=[];
    var allFolders=[];
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
                    if(status=='success'){
                        // console.log('callback in filesys')
                        fileTree=data;
                        allFiles=[];
                        allFolders=[];
                        makeListOfFiles(fileTree,'');

                        // console.log(allFolders);
                        // console.log(allFiles);
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
        }
    }
    function makeListOfFiles(currTree, path){
        for(key in currTree){
            if(isFile(key, currTree[key]))
                allFiles.push(path+'/'+key);
            else{
                allFolders.push(path+'/'+key);
                makeListOfFiles(currTree[key], path+'/'+key);
            }
        }
    }
    function isFile(name, contents){

        //todo:make this better
        if(name.indexOf('.')>0)
            return true;
        return false;
    }
    function writeTreeToLocalStorage(){
        // console.log('writing tree to local storage');

        //todo, divide up the data, make it asynchronous
        //indexedDB?
        //var savedTree=traverseTree()
        for(var i=0; i<openFiles.length; i++){
            var file = traverseTree(openFiles[i], function(i, file, pathname, pathlength){
                
                //localStorage.setItem('6004file'+pathname, JSON.stringify(fileTree));    

                return true;
            });
            localStorage.setItem('6004file'+openFiles[i], JSON.stringify(file));
        }
        localStorage.setItem('6004data', JSON.stringify(fileTree));   
        
    }
    function readTreeFromLocalStorage(){
        //todo make it asynchronous
        var x= JSON.parse(localStorage.getItem('6004data'));
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
        var pathArray=fileName.match(/[^<>\:\"\|\/\\\?\*]+/g);
        // console.log(pathArray);
        var followPath=fileTree;
        for(var i in pathArray){

            // action function of 3 variables, the index, the current path, the current path name
            //, and the length of the whole pathArray. 
            // returns true if we can continue
            if(action(i, followPath, pathArray[i], pathArray.length))
                followPath=followPath[pathArray[i]];//.slice(1)];
        }
        return followPath || []; // wtf?
    }
    function getFileFromTree(fileName){
        var finalTree=traverseTree(fileName, function(i, tree){return true;} );

        if(finalTree.length==0)
            return false;
        //else there is a file
        return finalTree[0];
    }
    function writeFileToTree(fileName, fileData, onServer){
        var finalTree=traverseTree(fileName, function(i, followPath, currentPath, length){
            if(i==length-1){
                // console.log(fileName+' being written');
                followPath[currentPath]={name:fileName, data:fileData, onServer:onServer};
                
                return false;
            }
            return true;
        });
        openFiles.push(fileName);
        writeTreeToLocalStorage();
        return finalTree;
    }


    function saveFile(fileName, fileData, callback, callbackFailed){
        sendAjaxRequest(fileName, fileData,'json', 'saveFile', function(data, status){
            callback(data, status);
            writeFileToTree(fileName, fileData);
            updated=false;
        }, callbackFailed);
        
    }

    function newFile(fileName, fileData, callback, callbackFailed){
        sendAjaxRequest(fileName, fileData,'json', 'newFile', callback, callbackFailed);
        updated=false;
    }   
    function newFolder(folderName, callback, callbackFailed){
        sendAjaxRequest(folderName,null,'json', 'newFolder', callback, callbackFailed);
        updated=false;
    }   
    function deleteFile(fileName, callback, callbackFailed){
        sendAjaxRequest(fileName,null,'json', 'deleteFile', callback, callbackFailed);
        updated=false;
    }

    function sendAjaxRequest(filePath, fileData, dataType, query, callbackFunction, failFunction){
        // console.log(failFunction);
        failFunction=failFunction||failResponse;

        if(!fileData)
            fileData='';


        url=mServer+filePath;
        var data={dummy:'dummy', username:mUsername, query:query, fname:filePath, fdata:fileData}
        var req=$.ajax({
                type:"POST",
                url:url, 
                data:data,
                dataType:dataType,
            });
        req.done(function(data, status){
            //check if status is successful
            updated=true;
                callbackFunction(data, status);
        });
        req.fail(failFunction);
        req.always(function(request, status){
                // console.log(status);
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
    exports.deleteFile =deleteFile;

    exports.getServerName=function(){return mServer;};
    exports.getUserName=function(){return mUsername;};
    exports.isFile=function(fileName){
        // console.log(fileName+' check if in allfiles');
        return _.contains(allFiles, fileName)
    }
    exports.isFolder=function(folderName){
        // console.log(folderName+' check if in allFolders');
        return _.contains(allFolders, folderName)
    }
    function setup(username, server){

        mServer=server||DEFAULT_SERVER;
        mUsername=username;
    }

    exports.setup=setup;
    exports.getFileFromTree=getFileFromTree;

    return exports;
}();