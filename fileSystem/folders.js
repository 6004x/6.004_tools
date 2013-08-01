var Folders=new function(){
    var rootNode, editor, editorWrapper;
    var openFiles=[];
    var editMode
    var fileRegexp=/(<|>|\:|\"|\||\/|\\|\?|\*|~)/g;
    var folderRegexp=/(<|>|\:|\"|\||\/|\\|\?|\*|~|\.)/g;
    //attaches file list to the default node
    function refresh(){
        getFileList(rootNode.find('.filePaths'));
    }

    var isLoadingFileList = false;
    function getFileList(parentNode){
        if(isLoadingFileList) return;
        isLoadingFileList = true;

        //clears out the old filelist
        
        //FileSystem keeps track of the username

        //fetch the filelist from server, then add the files to the filesystem.
        FileSystem.getFileList(
            function(data){
                parentNode.empty();
                var username=FileSystem.getUserName();
                fileList={};
                fileList[username]=data;
                addFiles(fileList, parentNode, '');
                isLoadingFileList = false;
                FileSystem.getFile('/lab 4/beaver_4.tsim', function(file){
                    editor.openTab(file.name, file.data, true);
                });
                FileSystem.getRelativeFile('./newFolder/counting.tsim', '/lab 4/beaver_4.tsim', function(file){
                    editor.openTab(file.name, file.data, true);
                });
            }, noServer
        );
        var level = 0;

        function buildListButton(icon, callback, path, tooltip) {
            var span = $('<span>').addClass('btn btn-link hover_button file_button pull-right');
            $('<i>').addClass(icon).appendTo(span);
            if(tooltip) {
                span.tooltip({title: tooltip, delay: {show: 100, hide: 0}, container: 'body'});
                // This prevents weird interactions with the expanding lists.
                span.on('show', function(e) { e.stopPropagation(); });
                span.on('hide', function(e) { e.stopPropagation(); });
            }
            span.click(function(e) {
                e.stopPropagation();
                var current_path=$(e.currentTarget).parents('li').attr('data-path'); 
                if(callback) {
                    callback(current_path);
                }
            });
            return span;
        }

        function addFiles(fileList, parentNode, parentPath){
            //testing whether username chenged or not, to change data structure
            level++;
            _.each(fileList, function(subList, name) {

                var folderName = name;
                var path = parentPath + name;
                var collapseName='collapse'+(parentPath+name).replace(/(\/|\s)/g, '_');
                if(level==1){
                    //we are in root folder, so we need to ignore username
                    name = '';
                }
                //collapseName is name without whitespace
                if(name.indexOf('~') > -1){
                    //metadata
                    // console.log(name);
                } else if(subList['~type'] === 'file') {
                    //if the name does not have a period, then it is a file and not a folder
                    var listVar=$('<li>').addClass('file_name')
                        .attr('data-path', parentPath+name)
                        .append($('<span>'+name+'</span>'));

                    var deleteButton = buildListButton('icon-trash', deleteFile, path, 'Delete');
                    var renameButton = buildListButton('icon-pencil', renameFile, path, 'Rename');
                    var downloadButton = buildListButton('icon-download-alt', null, path, 'Download');

                    var fileButtonDiv = addDiv('file_button_div');

                    fileButtonDiv.append(downloadButton, renameButton, deleteButton);

                    listVar.append(fileButtonDiv);

                    listVar.click(function(e){
                        getFile(path);
                    });
                    
                    parentNode.append(listVar);
                }
                else {//it is a folder, we must go deeper

                    //collapser area will hold the folder name and will 
                    //allow user to hide and expand folderContents
                    var collapserDiv=addDiv('folderContents');
                    var collapser=$('<li>').addClass('folderName')
                        .attr({
                            'data-toggle':'collapse',
                            'href':'#'+collapseName,
                            'data-path': parentPath+name+'/',
                        });
                    if(level==1)//keep track of the root
                        collapser.addClass('rootFolderName');

                    collapserDiv.append(collapser);

                    //add folder name and the arrow
                    var arrow = $('<i>').addClass("icon-chevron-down pull-left open_indicator").addClass(collapseName);
                    collapser.append(arrow).append($('<span>').text(folderName));

                    var newFileButton = buildListButton('icon-file', newFile, path+'/', 'New File');
                    var newFolderButton = buildListButton('icon-folder-open', newFolder, path+'/', 'New Folder');
                    var deleteButton = buildListButton('icon-trash', deleteFile, path+'/', 'Delete Folder');

                    var newButtonDiv = addDiv('folder_button_div');
                    newButtonDiv.append(newFileButton, newFolderButton);

                    if(level > 1) // don't allow user to delete root folder
                        newButtonDiv.append(deleteButton);

                    collapser.append(newButtonDiv);
                    
                    //the folder contents sublist, will hold all files and subfolders
                    var subListUL=$('<ul id="'+collapseName+'" class="collapse in"></ul>');

                    //when it is not collaped, change the arrow icon
                    subListUL.on('show', function(e) {
                        arrow.addClass('icon-chevron-down').removeClass('icon-chevron-right');
                        e.stopPropagation();
                    });
                    //when it is collapsed, change the arrow icon
                    subListUL.on('hide', function(e){
                        arrow.removeClass('icon-chevron-down').addClass('icon-chevron-right');
                        e.stopPropagation();
                    });

                    if(Object.keys(subList).length>0){
                        //if the subfolder has files inside
                        //recursively fill the tree out
                        addFiles(subList, subListUL,parentPath+name+'/');
                    }
                    else{
                        //the subfolder has no files inside, it's an empty folder
                        subListUL.append('[empty folder]');
                    }
                    collapserDiv.append(subListUL);
                    parentNode.append(collapserDiv);
                }
            });
        }
    }
    function noServer(){
        alert('there is no server online');
    }
   

    function getFile(fileName){
        console.log('getting '+fileName);
        FileSystem.getFile(fileName, displayFile);
    }

    function displayFile(file){
        editor.openTab(file.name, file.data, true); 
        openFiles.push(file);
        $(window).resize();
    }


    function newFolder(file_path){
        var handleCreate = function() {
            var folderName = modal.inputContent();
            //checks against regexp
            if(!isValidName(folderRegexp, folderName)){
                modal.showError('Folder names cannot contain ., \\, \/, :, ", <, >, |, ?, or *');

                return;
            }
            var folderPath = file_path + folderName;
            
            //check hopefully there is not another folder already with that name. 
            if(FileSystem.isFolder(folderPath)) {
                modal.showError(folderPath+' is already a folder; please choose another name.');
                return;
            }


            FileSystem.newFolder(folderPath, function(){
                refresh();
                modal.dismiss();
            });
        }
        
        var modal = new ModalDialog();
        modal.setTitle("New Folder");
        modal.setText("Enter a name for your folder:");
        modal.inputBox({
            prefix: '/' + FileSystem.getUserName() + file_path,
            callback: handleCreate
        });
        modal.addButton('Cancel', 'dismiss');
        modal.addButton('Create', handleCreate, 'btn-primary');
        modal.show();
    }

    function isValidName(fileRegexp, name){
        return (name.length > 0) && !fileRegexp.test(name);
    }

    function newFile(file_path) {
        var handleCreate = function() {
            var fileName = modal.inputContent();
            
            if(!isValidName(fileRegexp, fileName)){
                modal.showError('File names cannot be empty or contain \\, \/ , : , " , < , > , | , ? , * , or ~');

                return;
            }

            var newFileName = '';
            if(fileName.indexOf('.')<0)
                newFileName=file_path+fileName+'.'+editMode;
            else
                newFileName=file_path+fileName;
            //checks that there is not already another file with that name.
            if (FileSystem.isFile(newFileName)){
                modal.showError(fileName+'.'+editMode+' is already a file, please choose another name');
                return;
            }

            var new_file = {
                name: newFileName,
                data: '',
            };

            FileSystem.newFile(new_file.name, new_file.data, function(data){
                displayFile(data);
                refresh();
                modal.dismiss();
            });
        }

        var modal = new ModalDialog();
        modal.setTitle("New File");
        modal.setText("Enter a name for your file:");
        modal.inputBox({
            prefix: '/' + FileSystem.getUserName() + file_path,
            callback: handleCreate
        });
        modal.addButton('Cancel', 'dismiss');
        modal.addButton('Create', handleCreate, 'btn-primary');
        modal.show();
    }

    function deleteFile(path){
        var modal = new ModalDialog();
        modal.setTitle("Delete File");
        modal.setText("Are you sure you want to delete " + path + "?");
        modal.addButton('Cancel', 'dismiss');
        modal.addButton('Delete', function() {
            FileSystem.deleteFile(path, function() {
                refresh();
                modal.dismiss();
            });
        }, 'btn-danger');
        modal.show();
    }

    function renameFile(path){
        var file_path = path.slice(0, path.lastIndexOf('/'));
        var newFileName = '';

        var handleRename = function() {
            var fileName = modal.inputContent();
            console.log(fileName + ' obtained from modal')
            
            if(!isValidName(fileRegexp, fileName)){
                modal.showError('Names cannot be empty or contain \\, \/ , : , " , < , > , | , ? , * , or ~');
                return;
            }

            if(fileName.indexOf('.') < 0)
                newFileName=file_path+'/'+fileName+'.'+editMode;
            else
                newFileName=file_path+'/'+fileName;
            if(FileSystem.isFile(newFileName)) {
                modal.showError(fileName + '.' + editMode + ' is already a file, please choose another name');
                return;
            }

            var new_file = {
                name: newFileName,
                data: '',
            };

            console.log('rename file to ' + newFileName);
            FileSystem.renameFile(path, newFileName , function(data){
                console.log(data.status + ' new file');
                displayFile(data);
                refresh();
                modal.dismiss();
            });
        }


        var modal = new ModalDialog();
        modal.setTitle("Rename");
        modal.addButton('Cancel', 'dismiss');
        modal.addButton('Rename', handleRename, 'btn-primary');
        modal.setContent("<p>Enter a new name for <strong>" + path + "</strong></p>");
        modal.inputBox({
            prefix: '/' + FileSystem.getUserName() + file_path+'/',
            callback: handleRename
        });
        modal.show();
    }

    function commit() {
        // Todo.
    }

    function setup(root, editorN, mode){
        rootNode=$(root);
        editor=editorN;
        editMode=mode;
        //editorWrapper=addDiv('span10 folderStruct');
        var buttonDiv=addDiv('buttonDiv');
        addButtons(buttonDiv);

        sideBarNav=addDiv('sidebar-nav');
        var filesWrapper=$('<ul>').addClass('filePaths nav nav-list nav-stacked');
        
        sideBarNav.append(filesWrapper);

        var username = FileSystem.getUserName();
        
        rootNode.append(buttonDiv);
        rootNode.append(sideBarNav);

        refresh();
    }

    function addDiv(classes){
        if(!classes)
            classes='';
        return $('<div></div>').addClass(classes);
    }

    function addButtons(buttonDiv){
        var toolbar = new Toolbar(buttonDiv);
        toolbar.addButtonGroup([
            new ToolbarButton('icon-chevron-left', hideNavBar, 'Hide Folders'),
            new ToolbarButton('icon-refresh', refresh, 'Refresh'),
            new ToolbarButton('icon-off', _.identity, 'Commit and Close')
        ]);

        //now adding editor buttons
        editor.addButtonGroup([new ToolbarButton('show folders',showNavBar, '')]);
    }

    function hideNavBar(){
        rootNode.css('position', 'relative');
        var width=-(rootNode.width());
        var editorWrapper = $('.span9');
        console.log(width);
        rootNode.animate({'left' :width}, 500, 'swing', function(){
                rootNode.detach()
        });
        var offset=-editorWrapper.offset().left+parseInt(editorWrapper.css('margin-left'));
        console.log(offset)
        editorWrapper.css('position', 'relative')
        editorWrapper.animate({'left' :offset}, 500, 'swing', function(){
            editorWrapper.removeClass('span9').addClass('span12');
            editorWrapper.css('left', 0);
        });
    }

    function showNavBar(){
        if(rootNode.parent().length==0){
            var editorWrapper = $('.span12');
            editorWrapper.removeClass('span12').addClass('span9');

            console.log(rootNode.parent());

            $('.row').prepend(rootNode);
            var width=(rootNode.width());
            editorWrapper.css('left', -width);
            console.log(width);
            editorWrapper.removeClass('float-right');
            
            rootNode.animate({'left' :0}, 500, 'swing', function(){
                
            });
            editorWrapper.animate({'left' :0}, 500, 'swing', function(){
                editorWrapper.removeClass('span12').addClass('span9')
            });
        }
    }
    return {setup:setup, refresh:refresh};
}();
