var FileSystem= function(){
    var DEFAULT_SERVER = 'https://localhost:6004';
    var mServer;
    var mUsername;
    var self = this;

    var openFiles=[];
    var allFiles=[];
    var allFolders=[];
    var fileTree={};

    var delimRegExp = /[^<>\$\:\"\|\/\\\?\*]+/g;
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
        file.name (path of file relative to root user folder)       
        file.data (String representation of file 'utf8')

        TO IMPLEMENT:
        file.isOpen
        file.onServer
    *
    */

    //TODO: rename folder, version control

    this.getFileList = function(callback, callbackFailed){
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
        if(mServer){
            sendAjaxRequest('/',null,'json', 'getFileList',
                function(data, status){
                    if(status=='success'){

                        mUsername = data.user;
                        fileTree = data.data;
                        allFiles=[];
                        allFolders=[];
                        console.log(fileTree);
                        makeListOfFiles(fileTree,'');

                        // console.log(allFolders);
                        // console.log(allFiles);
                        
                        writeTreeToLocalStorage();
                        updated=true;
                        online=true;
                        callback(data.data);

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
            if(key.indexOf('~') > -1){
                // console.log(key)
            } else if(isFile(key, currTree[key])){
                allFiles.push(path+'/'+key);
            }
            else{
                allFolders.push(path+'/'+key);
                makeListOfFiles(currTree[key], path+'/'+key);
            }
        }
    }
    function isFile(name, contents){
        // console.log(contents);
        // console.log(contents['~type'] === 'file')
        return contents['~type'] === 'file';
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
    
    function traverseTree(fileName, action){
        //TODO NEEDS ERROR HANDLING

        // Whitelist not blacklist of filenames
        var pathArray = fileName.match(delimRegExp);
        var followPath = fileTree;
        for(var i = 0; i < pathArray.length; i++){
            var pathName = pathArray[i]
            // action function of 3 variables, the index, the current path, the current path name
            //, and the length of the whole pathArray. 
            // returns true if we can continue
            try{
                if(action(i, followPath, pathName, pathArray.length))
                    followPath = followPath[pathName];//.slice(1)];
            } catch(e) {
                console.log(e.stack)
                console.log(i)
                console.log(pathArray);
                console.log(followPath);
            }
        }
        return followPath || {}; // wtf?
    }
    function getFileFromTree(fileName){
        var finalTree = traverseTree(fileName, function(i, tree){return true;} );
        console.log(finalTree);
        if(finalTree.length == 0)
            return false;
        //else there is a file
        return finalTree[0];
    }
 
    function writeFileToTree(fileName, fileData, onServer){
        var finalTree=traverseTree(fileName, function(i, followPath, currentPath, length){
            if(i==length-1){
                // console.log(fileName+' being written');
                followPath[currentPath] = {name:fileName, data:fileData, onServer:onServer};
                
                return false;
            }
            return true;
        });
        openFiles.push(fileName);
        writeTreeToLocalStorage();
        return finalTree;
    }


    //SERVER FUNCTIONS
    this.getFile = function(fileName, callback, callbackFailed){
        //username or some sort of authentication
        console.log(fileName);
        var file = null;
        console.log(fileTree);
        if(Object.keys(fileTree).length > 0)
            file = getFileFromTree(fileName);
        
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
    this.getRelativeFile = function(fileName, relativeFile, callback, callbackFailed){
        if(relativeFile.substring(0,1) == '/'){
            //not a relative file, but a direct path
            getFile(relativeFile, callback, callbackFailed);
        } else {
            //syntax
            // .. for up a level
            // . for up one level
            // nothing for directly relative file
            // / is not allowed as the first char, as that points to direct path file. 
            sendAjaxRequest(fileName, relativeFile, 'json', 'getRelative', function(data, status){
                console.log(data);
                callback(data);
            }, function(data, status){
                console.log('failure');
                var pathArray = fileName.match(delimRegExp);
                var relPathArray = relativeFile.match(delimRegExp);
                var newPathArray = [];
                console.log(pathArray);
                console.log(relPathArray);
                var first = true;
                for (var i = pathArray.length - 2, j = 0; j < relPathArray.length; j++){
                    if(first){
                        first = false;
                    } 
                        if (relPathArray[j] === '..'){
                            console.log('.. path')
                            //newPathArray.push(pathArray[i]);
                            //FIX DOUBLE ..
                            i--;

                            console.log(i);
                        } else {
                            console.log('current path'+i)
                            var k = 0;
                            for( k = 0; k <= i && k < pathArray.length - 1 ; k++){
                                newPathArray.push(pathArray[k])
                            }
                            for ( k = j; k < relPathArray.length ; k++){
                                var pathSeg = relPathArray[k];
                                console.log(pathSeg)
                                if(pathSeg !== '.' && pathSeg !== '..')
                                    newPathArray.push(pathSeg)
                                else if(pathSeg === '.')
                                    console.log('. detected')
                                else if(pathSeg == '..'){
                                    console.log('.. is not allowed here, sorry');
                                } else
                                    break;
                            }
                            if(k === relPathArray.length)
                                break;
                        } 
                        if(i < -1)
                            console.log('broke');
                }
                console.log(newPathArray);
                
                var newFilePath = '';
                for (var i = 0; i < newPathArray.length; i++){
                    newFilePath += '/'+newPathArray[i];
                }
                console.log(newFilePath + ' is calculated')
                console.log('compared to ' + data.newPath);
                // getFile(newFilePath, function(data){
                //     console.log(data)
                    
                //     if(data.status === 'success'){
                //         callback(data);
                //     } else {
                //         callbackFailed(data);
                //     }
                // }, callbackFailed);

            });
        }
    }
    this.saveFile = function(fileName, fileData, callback, callbackFailed){
        sendAjaxRequest(fileName, fileData,'json', 'saveFile', function(data, status){
            callback(data);
            writeFileToTree(fileName, fileData);
            updated=false;
        }, callbackFailed);
        
    }

    this.newFile = function(fileName, fileData, callback, callbackFailed){
        sendAjaxRequest(fileName, fileData,'json', 'saveFile', callback, callbackFailed);
        updated=false;
    }   
    this.newFolder = function(folderName, callback, callbackFailed){
        sendAjaxRequest(folderName,null,'json', 'newFolder', callback, callbackFailed);
        updated=false;
    }   
    this.renameFile = function(oldFileName, newFileName, callback, callbackFailed){
        callbackFailed = callbackFailed || failResponse;
        sendAjaxRequest(oldFileName, newFileName, 'json', 'renameFile', function(data, status){
            console.log(status)
            if(status === 'success')
                callback(data);
        }, callbackFailed);
    }
    this.deleteFile = function(fileName, callback, callbackFailed){
        sendAjaxRequest(fileName, null, 'json', 'deleteFile', callback, callbackFailed);
        updated=false;
    }
    this.copyFile = function(fileName, folderDestination,  callback, callbackFailed){
        callbackFailed = callbackFailed || failResponse;
        var newFileName = fileName.split('/');
        console.log(newFileName)
        newFileName = newFileName.pop();
        newFileName = folderDestination + newFileName;
        console.log(newFileName);
        self.getFile(fileName, function(oldFile){
            self.saveFile(newFileName, oldFile.data, function(newFile){
                if(newFile.status = 'success'){
                    callback(newFile);
                }

            })
        }, callbackFailed)
    }
    this.moveFile = function(fileName, folderDestination, callback, callbackFailed){
        self.copyFile(fileName, folderDestination, function(newFile){
            self.deleteFile(fileName, function(data){
                if(data)
                    callback(newFile);
                console.log(data)
                console.log('from deleteFile');
            }, callbackFailed)
        }, callbackFailed)

    }

    function sendAjaxRequest(filePath, fileData, dataType, query, callbackFunction, failFunction){
        // console.log(failFunction);
        failFunction=failFunction||failResponse;

        if(!fileData)
            fileData='';


        url=mServer+filePath;
        var data={query:query, name:filePath, data:fileData}
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


    this.getServerName = function(){
        return mServer;
    };
    this.getUserName = function(){
        if(!mUsername)
            sendAjaxRequest('/', null, "json", "getUser", function(data){
                mUsername = data.user;
                console.log(data);
                return mUsername;
            })
        else
            return mUsername;
    };
    this.isFile = function(fileName){
        // console.log(fileName+' check if in allfiles');
        return allFiles.indexOf(fileName) !== -1;
    }
    this.isFolder = function(folderName){
        // console.log(folderName+' check if in allFolders');
        return allFolders.indexOf(folderName) !== -1;
    }
    this.setup = function(server){

        mServer=server||DEFAULT_SERVER;
    }

    return self;
}();