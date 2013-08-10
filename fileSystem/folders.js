var Folders=new function(){
    var rootNode, editor, editorWrapper;
    var openFiles = [];
    var editMode;
    var fileRegexp=/(<|>|\:|\"|\||\/|\\|\?|\*|~)/;
    var folderRegexp=/(<|>|\:|\"|\||\/|\\|\?|\*|~|\.)/;
    var collapsedFolders = {};
    var textInputOn = false;
    //attaches file list to the default node
    function refresh(callback){
        getFileList(callback); 
        $('.hover_button').tooltip('hide');
    }

    var isLoadingFileList = false;
    function getFileList(callback, parentNode){
        callback = callback || _.identity
        parentNode = parentNode || rootNode.find('.file_paths');
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
                FileSystem.getUserName();
                callback(true);
            }, function(status){
                noServer();
                callback(false);
            }
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
                        $('.file_paths').append(div)
                        return div;
                    }
                    listVar.draggable({
                        'containment' : '.file_paths',
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
                    var totalPath =  parentPath+name+'/';
                    if(level == 1){
                        totalPath = '';
                    }
                    var folderContentsDiv = addDiv('folder_contents')
                        .attr({
                            'data-path':totalPath,
                        });
                    var collapser = $('<li>').addClass('folder_name')
                        .attr({
                            'data-toggle':'collapse',
                            'href':'#'+collapseName,
                            'data-path': totalPath,
                        });
                    if(level === 1)//keep track of the root
                        collapser.addClass('root_folder_name');

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
                    /*var timeOut;
                    collapser.hover(function(e){
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
                    if(collapsedFolders[collapseName] === undefined){
                        collapsedFolders[collapseName] = level > 1;
                    }

                    //the folder contents sublist, will hold all files and subfolders
                    var subListUL=$('<ul>').addClass('collapse').attr('id', collapseName);
                    //adding the class in will expand/collapse the folder according to user preference/
                    if(!collapsedFolders[collapseName]){
                        subListUL.addClass('in');

                    } else {
                        arrow.toggleClass('icon-chevron-down icon-chevron-right');
                    }

                    //when it is not collaped, change the arrow icon, mark the state
                    subListUL.on('show', function(e) {
                        arrow.toggleClass('icon-chevron-down icon-chevron-right');
                        collapsedFolders[$(e.currentTarget).attr('id')] = false;
                        updatePrefs();
                        e.stopPropagation();
                    });

                    //when it is collapsed, change the arrow icon, mark the state
                    subListUL.on('hide', function(e){
                        arrow.toggleClass('icon-chevron-down icon-chevron-right');
                        collapsedFolders[$(e.currentTarget).attr('id')] = true;
                        updatePrefs();
                        e.stopPropagation();
                    });

                    
                    if(Object.keys(subList).length > 1){
                        //if the subfolder has files inside
                        //recursively fill the tree out
                        addFiles(subList, subListUL, totalPath);
                    }
                    else{
                        //the subfolder has no files inside, it's an empty folder
                        subListUL.append(addDiv('muted').text('[empty folder]'));
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
        $(window).resize();
        updatePrefs();
    }

    function updatePrefs(){
        var openFiles = editor.filenames();
        var object = {
            openFiles : openFiles,
            collapsedFolders:collapsedFolders,
        }
        localStorage.setItem('6004folderspref'+editMode, JSON.stringify(object))
    }
    
    function isValidName(regExp, name){
        return (name.length > 0) && !regExp.test(name);
    }

    function textInput(submitTextAction, parent, validateFunction, title, defaultText){
        var title = title || 'Warning';
        var validateFunction = validateFunction || function(text){return text.length > 0};
        var defaultText = defaultText || 'type here';
        var valid = false, canceled = true;
        var shown = false;
        if(textInputOn){
            return false;
        }
        textInputOn = true;

        var inputLi = $('<div>').addClass('text-input input-append control-group input_file_name')
            .css({
                    'margin-bottom': 0,
                });

        var input = $('<input>').addClass('new_text input_file_name')
            .width(parseInt(parent.width())-60)
            .attr({
                'type' : 'text', 
                'placeholder' : defaultText,
                'border-color' : 'gray',
        });
        var cancelButton = $('<button>').addClass('add-on btn btn-danger')
            .append('&times;')
        //wrapper for error reporting toolip        
        var tooltipContent = $('<div>').attr('id', 'tooltip_content')
        //adding actions for external
        
        var actions = {
            showError : function(message){
                tooltipContent.text(message);
                input.attr('data-content', String(tooltipContent[0].outerHTML));
                inputLi.addClass('error');
                if(!shown){
                    input.popover('show');
                    $('#tooltip_content').on('click', function(e){
                        clearTimeout(focustimeOut)
                        
                        input.popover('hide');
                        input.focus();
                        e.stopPropagation();
                    })
                }
                valid = false;
            }, 
            hideError : function(){
                inputLi.removeClass('error');
                if(shown)
                    input.popover('hide');
            },
            destroy : function(){
                canceled = true;
                input.popover('destroy');
                inputLi.detach();
                collapsedFolders[$(parent).attr('id')] = false; 
                textInputOn = false;
            }
        }
        //adding listener actions
        cancelButton.on('click', function(e){
                clearTimeout(focustimeOut)
                actions.destroy();
            });
        
        input.on('keyup', function(e) {
                var key = e.which || e.keyCode;
                var text = input.val();
                canceled = true;
                if (key == 13) { // 13 is enter
                    submitTextAction(text,  actions); //submit action
                    e.preventDefault();
                } else if (key == 27) { //27 is escape key
                    actions.destroy();
                }
                if(!validateFunction(text,  actions)){
                    console.log('invalid action');
                    valid = false;
                } else {
                    actions.hideError();
                    valid = true;
                }
            });
        var focustimeOut;
        input.on('focusout', function(){
            focustimeOut = setTimeout(function(){
                if(!canceled && validateFunction(input.val(), actions))
                    submitTextAction(input.val(), actions);
            }, 100);
            
        })

        input.popover({
            'placement' : 'bottom',
            'trigger' : 'manual',
            'container'  : 'body',
            'html' : true,
        })
        input.popover().on('show', function(e){
            shown = true;
            e.stopPropagation();
        })
        input.popover().on('hide', function(e){
            shown = false;
            e.stopPropagation();
        })

        //filling in text box with default value
        var count = 0;
        var untitled = defaultText;
        while(!validateFunction(untitled, actions)){
            count++;
            untitled = defaultText + count;
        }
        input.val(untitled);
        actions.hideError();
        inputLi.append(input, cancelButton);
        $(parent).prepend(inputLi);

        input.focus();
        input.select();
        

    }
    function newFSObject(parent, validateName, action, title, defaultText){
        var handleCreate = function(fileName, actions) {
            validName = validateName(fileName, actions);
            if(validName){
                action(validName, actions);
            } else {
                console.log(validName + ' is invalid, oops')
            }
        }
        //attaches the input to the collapsable value of 
        var childDiv = $($(parent).attr('href'));
        //in case you hit new in a closed folder, it opens it. 
        if(!childDiv.hasClass('in')){
            childDiv.collapse('show');

        }
        textInput(handleCreate, childDiv, validateName, title, defaultText);
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
           
            console.log(fileName)
            if(!isValidName(fileRegexp, fileName)){
                actions.showError('File names cannot be empty or contain \\, \/ , : , " , < , > , | , ? , * , or ~');
               
                return false;
            } 
            var newFileName = '';
            if(fileName.indexOf('.') < 0)
                newFileName=file_path+fileName+'.'+editMode;
            else
                newFileName=file_path+fileName;
            //checks that there is not already another file with that name.
            if (FileSystem.isFile(newFileName)){
                actions.showError('file already exists ');
                
                return false;
            } 
            return newFileName;
        }

        newFSObject(parent, validNewFileName, newFileAction, 'New File', 'new file');

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
        newFSObject(parent, validFolderName, newFolderAction, 'New Folder', 'new folder');
    }
    function deleteFile(path){
        var modal = new ModalDialog();
        modal.setTitle("Delete File");
        modal.setText("Are you sure you want to delete " + path + "?");
        modal.addButton('Cancel', 'dismiss');
        modal.addButton('Delete', function() {
            FileSystem.deleteFile(path, function() {
                editor.closeTab(path);
                updatePrefs();
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
            new ToolbarButton('icon-refresh', refresh, 'Refresh'),
            new ToolbarButton('icon-off', _.identity, 'Off is not implemented')
        ]);
    }

    function setup(root, editorN, mode){
        rootNode = $(root);
        console.log(root);
        editor = editorN;
        editMode = mode;

        var buttonDiv = addDiv('buttonDiv');
        addButtons(rootNode);

        var sideBarNav = addDiv('sidebar-nav');
        var filesWrapper = $('<ul>').addClass('file_paths nav nav-list nav-stacked');

        filesWrapper.height(window.innerHeight - filesWrapper.offset().top);
        $(window).on('resize',function(){filesWrapper.height(window.innerHeight - filesWrapper.offset().top);})
        sideBarNav.append(filesWrapper);
        var pref = JSON.parse(localStorage.getItem('6004folderspref'+editMode));
       
        if(pref){
            if(pref.collapsedFolders)
                collapsedFolders = pref.collapsedFolders;
            if(pref.openFiles)
                openFiles = pref.openFiles;
        }

        
        var username = FileSystem.getUserName();
        rootNode.append(buttonDiv);
        rootNode.append(sideBarNav);

        refresh(function(status){
            if(status){
                for(var i = 0; i <  openFiles.length; i++){
                    var file = openFiles[i];
                    FileSystem.getFile(file, function(data){
                        displayFile(data);
                    }, function(){
                        console.log('failed init openFiles')
                    });
                }
            }
            else
                console.log('failed refresh');
            
        });
    }
    return {setup:setup, refresh:refresh};
}();
