var Folders=new function(){
    var rootNode, editor, editorWrapper;
    var openFiles=[];
    var editMode
    var fileRegexp=/(<|>|\:|\"|\||\/|\\|\?|\*|~)/;
    var folderRegexp=/(<|>|\:|\"|\||\/|\\|\?|\*|~|\.)/;
    var collapsedFolders = {};
    var textInputOn = false;
    //attaches file list to the default node
    function refresh(){
        $('.tooltip').hide();
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
                for (var key in collapsedFolders){
                    if(collapsedFolders[key]){
                        $('#'+key).collapse('hide');
                    } else {
                        $('#'+key).collapse('show')
                    }
                }
            }, noServer
        );
        var level = 0;

        function buildListButton(icon, callback, type, tooltip) {
            var span = $('<span>').addClass('btn btn-link hover_button pull-right ' + type);
            $('<i>').addClass(icon).appendTo(span);
            if(tooltip) {
                span.tooltip({title: tooltip, delay: {show: 100, hide: 0}, container: 'body'});
                // This prevents weird interactions with the expanding lists.
                span.on('show', function(e) { e.stopPropagation(); });
                span.on('hide', function(e) { e.stopPropagation(); });
            }
            span.click(function(e) {
                e.stopPropagation();
                var current_path = $(e.currentTarget).parents('li').attr('data-path'); 
                if(callback) {
                    callback(current_path, $(e.currentTarget).parents('li'));
                }
            });
            return span;
        }

        function dragFile(filePath, folderDestination, type){
            type = type || 'move'

            var filePathArr = filePath.split('/');
            var folderPathArr = folderDestination.split('/');
            console.log(filePathArr); console.log(folderPathArr);
            var samePath = (filePathArr.length)  == folderPathArr.length;
            for(var i = 0, j = 0; i < filePathArr.length -1 && j < folderPathArr.length; i++, j++){
                console.log(filePathArr[i] === folderPathArr[j])
                if(filePathArr[i] !== folderPathArr[j]){
                    samePath = false;
                    console.log(filePathArr);
                    console.log(folderPathArr);
                    break;
                }
            }
            console.log(samePath);
            if(!samePath){
                if(type === 'move')
                    FileSystem.moveFile(filePath, folderDestination, function(data){
                        console.log('moving ' + filePath )
                        console.log('to ' + data );
                        refresh();
                    })
                else if (type === 'copy')
                    FileSystem.copyFile(filePath, folderDestination, function(data){
                        console.log('moving ' + filePath )
                        console.log('to ' + data );
                        refresh();
                    })
            } else {
                console.log('do nothing');
            }
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

                    var deleteButton = buildListButton('icon-trash', deleteFile, 'file_button', 'Delete');
                    var renameButton = buildListButton('icon-pencil', renameFile, 'file_button', 'Rename');
                    var downloadButton = buildListButton('icon-download-alt', null, 'file_button', 'Download');

                    var fileButtonDiv = addDiv('file_button_div');

                    var timeOut;
                    /*listVar.hover(function(e){
                            var div = $(e.currentTarget);
                            var fileButtons = div.find('.file_button');
                            timeOut = setTimeout(function(){
                                fileButtons.css({
                                    display:'inline',
                                });
                                fileButtons.animate({'opacity' : 1,},150)
                            }, 200);
                        }, function(e){
                            clearTimeout(timeOut);
                            var div = $(e.currentTarget);
                            var fileButtons = div.find('.file_button');

                            fileButtons.animate({'opacity' : 0,},300, function(){
                                fileButtons.css({
                                   'display':'none',
                                });
                            });
                    });*/
                    fileButtonDiv.append(downloadButton, renameButton, deleteButton);

                    listVar.append(fileButtonDiv);

                    listVar.click(function(e){
                        getFile(path);
                    });
                    
                    parentNode.append(listVar);
                    function cloneFileName(e){
                        var current = $(e.currentTarget)
                        var div = $('<div>').append(current.text()).addClass('dragging_div file_name');
                        $('.filePaths').append(div)
                        return div;
                    }
                    listVar.draggable({
                        'containment' : '.filePaths',
                        'cursor' : 'move',
                        'delay' : 300,
                        'helper' : cloneFileName,
                        'distance' : 10,
                        'revert' : 'invalid',
                        'zIndex' : 100,
                        'cursorAt' : {'left' : 20},
                        'drag' : function(e, ui){

                        }
                    })
                    
                }
                else {//it is a folder, we must go deeper

                    //collapser area will hold the folder name and will 
                    //allow user to hide and expand folderContents
                    var folderContentsDiv = addDiv('folderContents')
                        .attr({
                            'data-path': parentPath+name+'/',
                        });
                    var collapser = $('<li>').addClass('folderName')
                        .attr({
                            'data-toggle':'collapse',
                            'href':'#'+collapseName,
                            'data-path': parentPath+name+'/',
                        });
                    if(level === 1)//keep track of the root
                        collapser.addClass('rootFolderName');

                    folderContentsDiv.append(collapser);
                    //add folder name and the arrow
                    var arrow = $('<i>').addClass("icon-chevron-down pull-left open_indicator").addClass(collapseName)
                        .css('height', 16);
                    collapser.append(arrow).append($('<span>').text(folderName));

                    var newFileButton = buildListButton('icon-file', newFile, 'folder_button', 'New File');
                    var newFolderButton = buildListButton('icon-folder-open', newFolder, 'folder_button', 'New Folder');
                    var deleteButton = buildListButton('icon-trash', deleteFile, 'folder_button', 'Delete Folder');

                    var newButtonDiv = addDiv('folder_button_div');
                    newButtonDiv.append(newFileButton, newFolderButton);
                    var timeOut;

                    /*collapser.hover(function(e){
                            var div = $(e.currentTarget);
                            var folderButtons = div.find('.folder_button')
                            timeOut =setTimeout(function(){
                                folderButtons.css({
                                    display:'block',
                                });
                                folderButtons.animate({'opacity' : 1,},150)
                            }, 300);
                        }, function(e){
                            clearTimeout(timeOut);
                            var div = $(e.currentTarget);
                            var folderButtons = div.find('.folder_button');

                            folderButtons.animate({'opacity' : 0,}, 200, function(){
                                folderButtons.css({
                                    'display':'none',
                                });
                            });
                    });*/

                    collapser.on('click', function(){
                        subListUL.collapse('toggle');
                        console.log('toggle');
                    });
                    if(level > 1) // don't allow user to delete root folder
                        newButtonDiv.append(deleteButton);

                    collapser.append(newButtonDiv);
                    if(!collapsedFolders[collapseName])
                        collapsedFolders[collapseName] = false;

                    //the folder contents sublist, will hold all files and subfolders
                    var subListUL=$('<ul>').attr('id', collapseName);

                    //when it is not collaped, change the arrow icon, mark the state
                    subListUL.on('show', function(e) {
                        arrow.addClass('icon-chevron-down').removeClass('icon-chevron-right');
                        collapsedFolders[$(e.currentTarget).attr('id')] = false;
                        e.stopPropagation();
                    });

                    //when it is collapsed, change the arrow icon, mark the state
                    subListUL.on('hide', function(e){
                        arrow.removeClass('icon-chevron-down').addClass('icon-chevron-right');
                        collapsedFolders[$(e.currentTarget).attr('id')] = true;
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
                    folderContentsDiv.append(subListUL);

                    var copyDiv = $('<div>').addClass('copy_div').css({
                        'position' : 'absolute',
                        'right' : 0,
                        'top' : 0,
                        'height' : 40,
                        'width' : 40,
                        'z-index' : 0,
                    })
                    // folderContentsDiv.append(copyDiv);

                    parentNode.append(folderContentsDiv);

                    folderContentsDiv.droppable({
                        'accept' : '.file_name',
                        'activeClass' : 'active_drop',
                        'greedy' : true,
                        'hoverClass' : 'hover_drop',
                        'tolerance' : 'pointer',
                        'activate' : function(e, ui){
                            // console.log(ui.draggable.data('path'));
                        },
                        'drop' : function(e, ui){
                            var filePath = ui.draggable.data('path');
                            var folderDestination = $(e.target).data('path');
                            console.log('file dragged ' + filePath);
                            console.log('dropped at ' + folderDestination);
                            dragFile(filePath, folderDestination, 'move')
                            
                        },
                    });

                    copyDiv.droppable({
                        'accept' : '.file_name',
                        'activeClass' : 'active_drop',
                        'greedy' : true,
                        'hoverClass' : 'hover_drop',
                        'tolerance' : 'pointer',
                        'activate' : function(e, ui){   
                        },
                        'drop' : function(e, ui){
                            var filePath = ui.draggable.data('path');
                            var folderDestination = $(e.target).data('path');
                            dragFile(filePath, folderDestination, 'copy');
                        },
                    });

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


    
    function isValidName(regExp, name){
        return (name.length > 0) && !regExp.test(name);
    }

    function textInput(callback, parent, validFunction, title, defaultText){
        var title = title || 'Warning';
        var validFunction = validFunction || function(text){return text.length > 0};
        var defaultText = defaultText || 'type here';
        var valid = false;
        if(textInputOn){
            return false;
        }
        textInputOn = true;
        console.log(parent);

        var inputLi = $('<div>').addClass('text-input input-append control-group input_file_name')
            .css({
                    'margin-bottom': 0,
                });
        var input = $('<input>').addClass('new_text span2 input_file_name').attr({
            'type' : 'text', 
            'placeholder' : defaultText,
        })
        var cancelButton = $('<button>').addClass('add-on btn btn-danger')
            .append('&times;').css('padding-top', '0px');

        var actions = {
            showError : function(message){
                input.attr('data-content', message);
                inputLi.addClass('error')
                if(valid)
                    input.popover('show');
            }, 
            hideError : function(){
                inputLi.removeClass('error');
                input.popover('hide');
            },
            destroy : function(){
                parent.height(parent.height()-inputLi.height())
                input.popover('destroy');
                inputLi.detach();
                console.log($(parent).attr('id'));
                collapsedFolders[$(parent).attr('id')] = false; 
                console.log(collapsedFolders);
                textInputOn = false;
            }
        }

        cancelButton.on('click', function(e){
                actions.destroy();
            });
        
        input.on('keyup', function(e) {
                var key = e.which || e.keyCode;
                var text = input.val();
                if (key == 13) { // 13 is enter
                    callback(text,  actions);
                    e.preventDefault();
                } else if (key == 27) { //27 is escape key
                    actions.destroy();
                }
                if(!validFunction(text,  actions)){
                    //input.popover('show')
                    console.log('invalid action');
                    valid = false;
                } else {
                    actions.hideError();
                    valid = true;
                }
            });

        input.popover({
            'placement' : 'bottom',
            'trigger' : 'manual',
            'title' : title,
            'container'  : 'body',
        })
        inputLi.append(input, cancelButton);

        $(parent).prepend(inputLi);
        parent.height(parent.height()+inputLi.height())

        input.focus();
        return input;
    }
    function newFSObject(parent, validName, action, title, defaultText){
        var handleCreate = function(fileName, actions) {
            validName = validName(fileName, actions);
            if(validName){
                action(validName, actions);
            } else {
                console.log(validName + ' is invalid, oops')
            }
        }
        //attaches the input to the collapsable value of 
        var childDiv = $($(parent).attr('href'));
        textInput(handleCreate, childDiv, validName, title, defaultText);
    }
    function newFile(file_path, parent) {
        function newFileAction(validName, actions){
            var new_file = {
                name: validName,
                data: '',
            };
            FileSystem.newFile(new_file.name, new_file.data, function(data){
                displayFile(data);
                actions.destroy();
                refresh();
                return true;
            });
        }
        function validNewFileName(fileName, actions){
            var valid = false;
            console.log(fileName)
            if(!isValidName(fileRegexp, fileName)){
                actions.showError('File names cannot be empty or contain \\, \/ , : , " , < , > , | , ? , * , or ~');
                valid = false;
                return false;
            } else {
                valid = true;
            }
            var newFileName = '';
            if(fileName.indexOf('.') < 0)
                newFileName=file_path+fileName+'.'+editMode;
            else
                newFileName=file_path+fileName;
            //checks that there is not already another file with that name.
            if (FileSystem.isFile(newFileName)){
                actions.showError('file already exists ');
                valid = false;
                return false;
            } else {
                valid = true;
            }
            return newFileName;
        }

        newFSObject(parent, validNewFileName, newFileAction, 'New File', 'new file name');

    }
    function newFolder(file_path, parent){
            //checks against regexp
        function validFolderName(folderName, actions){
            if(!isValidName(folderRegexp, folderName)){
                actions.showError('Folder names cannot contain ., \\, \/, :, ", <, >, |, ?, or *');

                return false;
            }
            var folderPath = file_path + folderName;
            
            //check hopefully there is not another folder already with that name. 
            if(FileSystem.isFolder(folderPath)) {
                actions.showError(folderPath+' is already a folder; please choose another name.');
                return false;
            }
            return folderPath;
        }
        function newFolderAction(validFolderPath, actions){

            FileSystem.newFolder(validFolderPath, function(){
                actions.destroy()
                refresh();
            });
        }
        newFSObject(parent, validFolderName, newFolderAction, 'New Folder', 'new folder name');
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


        // var modal = new ModalDialog();
        // modal.setTitle("Rename");
        // modal.addButton('Cancel', 'dismiss');
        // modal.addButton('Rename', handleRename, 'btn-primary');
        // modal.setContent("<p>Enter a new name for <strong>" + path + "</strong></p>");
        // modal.inputBox({
        //     prefix: '/' + FileSystem.getUserName() + file_path+'/',
        //     callback: handleRename
        // });
        //modal.show();
    }

    
    function commit() {
        // Todo.
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
        var offset = -editorWrapper.offset().left + parseInt(editorWrapper.css('margin-left'));
        console.log(offset)
        editorWrapper.css('position', 'relative')
        editorWrapper.animate({'left' : offset}, 500, 'swing', function(){
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
    function setup(root, editorN, mode){
        rootNode = $(root);
        editor = editorN;
        editMode = mode;
        var buttonDiv = addDiv('buttonDiv');
        addButtons(buttonDiv);

        sideBarNav = addDiv('sidebar-nav');
        var filesWrapper = $('<ul>').addClass('filePaths nav nav-list nav-stacked');
        
        sideBarNav.append(filesWrapper);

        var username = FileSystem.getUserName();
        
        rootNode.append(buttonDiv);
        rootNode.append(sideBarNav);

        refresh();
    }
    return {setup:setup, refresh:refresh};
}();
