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
    /* folder scheme
        folder:
            name: 'text'
            path: path relative from root
            time: date last edited
            type: folder
            folders :{} has folder elements for each subfolder
            files : {} has file elements for each subfolder
            contentType : list of file types in the folder. 
        other metadata can be added as object elements
    */
    /*
    *   file scheme
        file:
            name: name of file 'text.type'
            path: Path of file relative to root user folder
            data: (String representation of file 'utf8')
            type: folder
            time: date last edited

        other metadata can be added as object elements
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
            sendAjaxRequest({name:'/',}, null, 'getFileList',
                function(data, status){
                    if(status=='success'){

                        mUsername = data.user;
                        fileTree = data.data;
                        allFiles = [];
                        allFolders = [];
                        // console.log(fileTree);
                        // console.log(fileTree);
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
    this.getSharedFileList = function(callback, callbackFailed){
        sendAjaxRequest({name:'/'}, null, 'getSharedFileList', function(data){
            fileTree = data.data;
            callback(fileTree);
        })
    }
    function makeListOfFiles(currTree){
        
        for(key in currTree.folders){
            var folder = currTree.folders[key]
            if(key.indexOf('~') > -1){
                console.log(key + 'metadata')
            } else {
                allFolders.push(folder.path);
                makeListOfFiles(folder);
            }
        }
        for (key in currTree.files){
            var file = currTree.files[key]
            allFiles.push(file.path);
        }
    }
    function writeTreeToLocalStorage(){
        // console.log('writing tree to local storage');

        //todo, divide up the data, make it asynchronous
        //var savedTree=traverseTree()
        for(var i=0; i < openFiles.length; i++){
            var filePath = openFiles[i];
            var file = traverseTree(filePath, function(i, followPath, pathname, end){

                if(end){
                    var file = followPath.files[pathname]
                    localStorage.setItem('6004file'+mUsername+'/'+filePath, JSON.stringify(file));    
                }
                return true;
            });
        }
        localStorage.setItem('6004data', JSON.stringify(fileTree));   
        
    }
    function readTreeFromLocalStorage(){
        //todo make it asynchronous
        var x = JSON.parse(localStorage.getItem('6004data'));
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
            // action function of 4 variables, the index, the current path, the current path name, and whether we're at the end or not
            //, and the length of the whole pathArray. 
            // returns true if we can continue
            try{
                // console.log(followPath)
                if(i < pathArray.length -1){                    
                    if(action(i, followPath, pathName, false))
                        followPath = followPath.folders[pathName];
                } else {
                    action(i, followPath, pathName, true)
                }
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
        var finalTree = traverseTree(fileName, function(){return true;} );
        // console.log(finalTree);
        //TODO fix, length does not work for objects
        if(finalTree.length == 0)
            return false;
        //else there is a file
        return finalTree[0];
    }
 
    function writeFileToTree(fileName, fileData, onServer){
        var finalTree=traverseTree(fileName, function(i, followPath, currentPath, end){
            if(end){
                console.log(fileName+' being written');
                followPath.files[currentPath].data = fileData;
                followPath.files[currentPath].onServer = onServer;
                followPath.files[currentPath].localDate = (new Date()).getTime();
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
        console.log('getting '+fileName);
        fileObj = {
            name : fileName,
        }
        if(online){
            sendAjaxRequest(fileObj, null, 'getFile', function(data, status){
                if(status == 'success'){
                    console.log(data)
                    callback(data);
                    if(!data.shared)
                        writeFileToTree(data.name, data.data, true);
                }
            }, callbackFailed);
        }else if (file){
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
            var fileObj = {
                name : fileName, 
                data : '',
            }
            var otherFileObj = {
                name : fileName, 
                data : '',
            }
            sendAjaxRequest(fileObj, otherFileObj, 'json', 'getRelative', function(data, status){
                // console.log(data);
                callback(data);
            });
            function getRelativeLocal(){
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

            }
        }
    }
    this.saveFile = function(fileName, fileData, callback, callbackFailed){
        var fileObj = {
            name : fileName, 
            data : fileData, 
            time : (new Date()).getTime(),
        }
        sendAjaxRequest(fileObj, null, 'saveFile', function(data, status){
            callback(data);
            writeFileToTree(fileName, fileData);
            updated = false;
        }, callbackFailed);
        
    }
    this.makeAutoSave = function(fileName, fileData, callback, callbackFailed){
        var fileObj = {
            name : fileName, 
            data : fileData, 
            time : (new Date()).getTime(),
        }
        sendAjaxRequest(fileObj, null, 'autoSaveFile', function(data, status){
            callback(data);
            writeFileToTree(fileName, fileData);
            updated = false;
        }, callbackFailed);
    }
    this.getAutoSave = function(fileName, callback, callbackFailed){
        var fileObj = {
            name : fileName, 
            time : (new Date()).getTime(),
        }
        sendAjaxRequest(fileObj, null, 'getAutoSave', function(data, status){
                if(data.status === 'success'){
                    callback(data);
                    //writeFileToTree(data.name, data.data, true);
                }
            }, callbackFailed);
    }
    this.newFile = function(fileName, fileData, callback, callbackFailed){
        var fileObj = {
            name : fileName, 
            data : fileData, 
            time : (new Date()).getTime(),
        }
        sendAjaxRequest(fileObj, null, 'saveFile', callback, callbackFailed);
        updated=false;
    }   
    this.newFolder = function(folderName, callback, callbackFailed){
        var fileObj = {
            name : folderName, 
            time : (new Date()).getTime(),
        }
        sendAjaxRequest(fileObj, null, 'newFolder', callback, callbackFailed);
        updated=false;
    }   
    this.renameFile = function(oldFileName, newFileName, callback, callbackFailed){
        var fileObj = {
            name : oldFileName, 
            time : (new Date()).getTime(),
        }
        var otherFileObj = {
            name : newFileName, 
            time : (new Date()).getTime(),
        }
        sendAjaxRequest(fileObj, otherFileObj, 'renameFile', function(data, status){
            console.log(status)
            if(status === 'success')
                callback(data);
        }, callbackFailed);
    }
    this.deleteFile = function(fileName, callback, callbackFailed){
        var fileObj = {
            name : fileName, 
            time : (new Date()).getTime(),
        }
        sendAjaxRequest(fileObj, null, 'deleteFile', callback, callbackFailed);
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

        var count = 0;
        var newFileFront = newFileName.substring(0, newFileName.lastIndexOf('.'));
        var newFileType = newFileName.substring(newFileName.lastIndexOf('.'))
        //loop to make sure that we don't overwrite an existing file
        //still allows the user to copy the file, doesn't overwrite
        //but names off the file
        var newFileNameTemp = newFileName;
        while(self.isFile(newFileNameTemp) && count <= 10){
            newFileNameTemp = newFileFront + '-' + count + newFileType;
            count++;
        }
        self.saveFile(newFileNameTemp, oldFile.data, function(newFile){
            if(newFile.status = 'success'){
                callback(newFile);
            }

        })
        }, callbackFailed)
    }
    this.moveFile = function(fileName, folderDestination, callback, callbackFailed){
        self.copyFile(fileName, folderDestination, function(newFile){
            self.deleteFile(fileName, function(data){
                if(data.status == 'success')
                    callback(newFile);
                console.log(data)
                console.log('from deleteFile');
            }, callbackFailed)
        }, callbackFailed)
    }
    this.getBackup = function(fileName, callback, callbackFailed){
        sendAjaxRequest({name:fileName, time: (new Date()).getTime()}, null, 'getBackup', callback, callbackFailed)
    }
    this.getSharedFile = function(fileName, callback, callbackFailed){
        sendAjaxRequest({name:fileName, time: (new Date()).getTime()}, null, 'getShared', callback, callbackFailed)
    }
    function sendAjaxRequest(fileObj, otherFileObj, query, callbackFunction, failFunction){
        // console.log(failFunction);
        failFunction = failFunction||failResponse;
        var filePath = fileObj.name;
        console.log(fileObj)
        if(filePath.substring(0,1)!=='/')
            filePath = '/'+filePath;
        var url = mServer+filePath;
        var data = {
            'query' : query, 
            'name' : filePath, 
            'fileObj' : fileObj, 
            'otherFileObj' : otherFileObj,
        }
        console.log(data)
        var req = $.ajax({
                'type' : "POST",
                'url' : url, 
                'data' : data,
                'dataType' : 'json',
            });
        req.done(function(data, status){
            //check if status is successful
            updated = true;
            console.log(data)
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
            sendAjaxRequest({name:'/', time: (new Date()).getTime(), object: 'data'}, null, "getUser", function(data){
                mUsername = data.user;
                console.log(data);
                online = true;
                return mUsername;
            })
        else
            return mUsername;
    };
    this.isFile = function(fileName){
        // console.log(fileName+' check if in allfiles');
        if(fileName.substring(0,1) ==='/')
            fileName = fileName.substring(1);
        console.log(allFiles.indexOf(fileName));
        return allFiles.indexOf(fileName) !== -1;
    }
    this.isFolder = function(folderName){
        // console.log(folderName+' check if in allFolders');
        if(folderName.substring(0,1) ==='/')
            folderName = folderName.substring(1);
        console.log(allFolders.indexOf(folderName))
        return allFolders.indexOf(folderName) !== -1;
    }
    this.setup = function(server){

        mServer = server||DEFAULT_SERVER;
    }

    return self;
}();