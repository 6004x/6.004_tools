var Folders=new function(){
    var rootNode, editor, editorWrapper;
    var openFiles=[];
    var editMode
    var fileRegexp=/(<|>|\:|\"|\||\/|\\|\?|\*|~)/g;
    //attaches file list to the default node
    function refreshFileList(){

        getFileList(rootNode.find('.filePaths'));
    }

    function getFileList(parentNode){

        parentNode.html('');
        //clears out the old filelist
        var username=FileSystem.getUserName();
        //FileSystem keeps track of the username
        $('.testDiv').text(username);

        //fetch the filelist from server, then add the files to the filesystem.
        FileSystem.getFileList(
            function(data){
                fileList=new Object;
                fileList[username]=data;
                addFiles(fileList, parentNode, '');
            }, noServer
        );
        var level = 0;
        function addFiles(fileList, parentNode, parentPath){
            //testing whether username chenged or not, to change data structure
            level++;    
            for(var name in fileList){
                subList=fileList[name];
                
                var folderName = name;
                var collapseName='collapse'+(parentPath+name).replace(/(\/|\s)/g, '_');
                if(level==1){
                    //we are in root folder, so we need to ignore username
                    name = '';
                }
                //collapseName is name without whitespace
                
                
                
                //TODO: find a way to differentiate folders differently
                if(name.indexOf('.') > -1){
                    //if the name does not have a period, then it is a file and not a folder
                    var listVar=$('<li>').addClass('file_name')
                        .attr('data-path', parentPath+name)
                        .append($('<a href=#>'+name+'</a>'));
                    var deleteButton=$('<span>').addClass('btn btn-link hover_button file_button delete_file pull-right')
                        .css({
                            'padding': '0px',
                            'height': '15px',
                            'display':'none',
                        })
                        .append('<i class=icon-trash>')
                        .attr('data-title', 'Delete '+ name);
                    var renameButton=$('<span>').addClass('btn btn-link hover_button file_button rename_file pull-right')
                        .css({
                            'padding': '0px',
                            'height': '15px',
                            'display':'none',
                        })                        
                        .append('<i class=icon-pencil>')
                        .attr('data-title', 'Rename '+ name);
                    var downloadButton=$('<span>').addClass('btn btn-link hover_button file_button download_file pull-right')
                        .css({
                            'padding': '0px',
                            'height': '15px',
                            'display':'none',
                        })
                        .append('<i class=icon-download-alt>')
                        .attr('data-title', 'Download '+ name);
                    var fileButtonDiv = addDiv('file_button_div');

                    fileButtonDiv.append(downloadButton, renameButton, deleteButton);

                    //hover actions that will allow the file buttons to fly in and fly out og the div
                    var timeOut;
                    listVar.hover(function(e){
                            var div = $(e.currentTarget);
                            var fileButtons = div.find('.file_button')
                            timeOut =setTimeout(function(){
                                fileButtons.css({
                                    display:'block',
                                    position:'relative',
                                    right:'-20px',
                                });
                                fileButtons.animate({'right': '0px'}, 100, function(){
                                    div.find('.folder_button').css('display', 'block')
                                });
                            }, 100);
                        }, function(e){
                            clearTimeout(timeOut);
                            var div = $(e.currentTarget);
                            var fileButtons = div.find('.file_button');
                            fileButtons.animate({'right': '-20px'}, 100, function(){
                                fileButtons.css({
                                    'display':'none',
                                });
                            });
                    });

                    listVar.append(fileButtonDiv);
                    //clicking on any part of the listVar will allow the user to fetch the file
                    listVar.on('click', function(e){
                        var node=$(e.currentTarget);
                        // console.log(node);
                        getFile(node.attr('data-path'));
                    });

                    deleteButton.on('click', function(e){
                        e.stopPropagation();
                        var current_path=$(e.currentTarget).parents('li').attr('data-path');
                        
                        deleteFile(current_path);
                    });
                    renameButton.on('click', function(e){
                        e.stopPropagation();
                        var current_path=$(e.currentTarget).parents('li').attr('data-path');
                        
                        renameFile(current_path);
                    })

                    
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
                    collapser.append(
                        $('<a>').append(
                            $('<i>').addClass("icon-chevron-down pull-left open_indicator")
                        ).append(folderName)
                    );
                    collapser.find('i').addClass(collapseName);

                    var newFileButton=$('<span>').addClass("btn btn-link hover_button folder_button new_file pull-right")
                        .css({
                            padding:'0px', 
                            height:'15px',
                        })
                        .append($('<i class=icon-file></span>'))
                        .attr('data-title', 'New File in '+name);
                    var newFolderButton=$('<span>').addClass("btn btn-link hover_button folder_button new_folder pull-right")
                        .css({
                            padding:'0px', 
                            height:'15px'
                        })
                        .append($('<i class=icon-folder-open></span>'))
                        .attr('data-title', 'New Folder in '+name);
                    var deleteButton=$('<span>').addClass('btn btn-link hover_button folder_button delete_folder pull-right')
                        .css({
                            padding: '0px',
                            height: '15px',
                        })
                        .append('<i class=icon-trash>')
                        .attr('data-title', 'Delete '+ name);
                    var newButtonDiv = addDiv('folder_button_div');
                    newButtonDiv.append(newFileButton);
                    newButtonDiv.append(newFolderButton);
                    if(level != 1) //won't allow user to delete root folder
                        newButtonDiv.append(deleteButton);
                    //hides all the buttons
                    newButtonDiv.find('.folder_button').css('display', 'none');
                    collapser.append(newButtonDiv);
                   
                    //button listeners for each file
                    newFileButton.on('click', function(e){
                        var current_path=$(e.currentTarget).parents('li').attr('data-path');
                        newFile(current_path);
                        e.stopPropagation();
                    });
                    newFolderButton.on('click', function(e){
                        var current_path=$(e.currentTarget).parents('li').attr('data-path');
                        newFolder(current_path);
                        e.stopPropagation();
                    });
                    deleteButton.on('click', function(e){
                        e.stopPropagation();
                        var current_path=$(e.currentTarget).parents('li').attr('data-path');
                        console.log(current_path);
                        deleteFile(current_path);
                    });

                    //animation, fly in and fly out buttons
                    var timeOut;
                    collapser.hover(function(e){
                            var div = $(e.currentTarget);
                            var newButtons = div.find('.folder_button')
                            timeOut =setTimeout(function(){
                                newButtons.css({
                                    display:'block',
                                    position:'relative',
                                    right:'-30px',
                                });
                                newButtons.animate({'right': '0px'}, 100, function(){
                                    div.find('.folder_button').css('display', 'block')
                                });
                            }, 100);
                        }, function(e){
                            clearTimeout(timeOut);
                            var div = $(e.currentTarget);
                            var newButtons = div.find('.folder_button');
                            newButtons.animate({'right': '-30px'}, 100, function(){
                                newButtons.css({
                                    'display':'none',
                                });
                            });
                    });
                    
                    //the folder contents sublist, will hold all files and subfolders
                    var subListUL=$('<ul id='+collapseName+' class ="collapse in"></ul>');

                    //when it is not collaped, change the arrow icon
                    subListUL.on('shown', function(e){
                        if(!$(e.target).hasClass('btn')){
                            var id=$(e.currentTarget).attr('id');
                            var arrow = rootNode.find('.folderName a>i ');
                            arrow=arrow.filter(function(i, e){
                                return $(e).hasClass(id);
                            });
                            if(arrow.hasClass('icon-chevron-right')){
                                arrow.addClass('icon-chevron-down')
                                arrow.removeClass('icon-chevron-right')
                            }                            
                            e.stopPropagation();
                        }
                    });
                    //when it is collapsed, change the arrow icon
                    subListUL.on('hidden', function(e){
                        if(!$(e.target).hasClass('btn')){
                            var id=$(e.currentTarget).attr('id');
                            var arrow = rootNode.find('.folderName a>i ');
                            arrow=arrow.filter(function(i, e){
                                return $(e).hasClass(id);
                            });
                            if(arrow.hasClass('icon-chevron-down')){
                                arrow.addClass('icon-chevron-right');
                                arrow.removeClass('icon-chevron-down');
                            }
                            e.stopPropagation();
                        }
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


            }

            //allows all buttons to have tooltips
            $('.hover_button').each(function(i, button){
                $(button).attr({
                    'data-toggle':"tooltip",
                    'data-trigger':'hover',
                    'data-container':'body',
                });
            });
            $('.btn').tooltip('hide');

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
    function displaySave(file){
        cornerAlert('Saved', file.name+' has been saved successfully', 'success');
    }

//current tab is file name
//.content get content of current tab
    function saveCurrentFile(){
        var file=new Object();
        file.name=editor.currentTab();
        file.data=editor.content();
        if(file.name){
            console.log('trying to save '+file.name);
            FileSystem.saveFile(file.name, file.data, displaySave);
        }
    }


    function newFolder(file_path){
        var isValid=false;
        var prompt='What is the name of the new folder you wish to make?';
        var prompt2=' ';
        

        addInputModal('New Folder', 'Create New Folder',null, prompt, FileSystem.getUserName()+file_path, function(modal){
            var folderName=modal.find('input').val();
            var folderPath=folderName;
            if(folderName==null){
                console.log('user canceled');
                isValid=false;
                modal.modal('hide');
                modal.detach();
                return;
            }
            if(!isValidName(fileRegexp, folderName)){
                prompt2='\n'+folderName+' is invalid'+'\n Names cannot contain \\,\/,:,",<,>,,|,?,*';
                modal.find('p').append('<br/>'+prompt2);
                isValid=false;
                return;
            }
            folderPath=file_path+folderName;
            

            if (FileSystem.isFolder(folderPath)){
                prompt2=folderPath+' is already a folder, please choose another name';
                modal.find('p').append('<br/>'+prompt2);
                return;
            }
            if(folderName!=null){
                FileSystem.newFolder(folderPath, function(){
                    refreshFileList()
                    modal.modal('hide');
                    modal.detach();
                });
            }
            else    
                console.log('null foldername, do nothing');
        });
    }

    function isValidName(fileRegexp, name){
        var regMatch=name.match(fileRegexp);
        return name.length > 0 && ! regMatch;
    }
    function newFile(file_path){
        
        var prompt='What is the name of the new file you wish to make';
        var isValid=false;
        
        var fileName='';
        var newFileName='';
        addInputModal('New File', 'Create New File',null, prompt, FileSystem.getUserName()+file_path, function(modal){
            fileName=modal.find('input').val();
            console.log(fileName+ ' obtained from modal')
            //checks to confirm valid file name
            if(fileName==null){
                console.log('user canceled');
                isValid=false;
                modal.modal('hide');
                modal.detach();
                return;
            }
            
            if(!isValidName(fileRegexp, fileName)){
                prompt2='Invalid Name.<br/> Names cannot be empty or contain \\, \/ , : , " , < , > , | , ? , * , or ~';
                isValid=false;
                modal.find('p').append('<br/>'+prompt2);
                return;
            }

            if(fileName.indexOf('.')<0)
                newFileName=file_path+fileName+'.'+editMode;
            else
                newFileName=file_path+fileName;
            

            if (FileSystem.isFile(newFileName)){
                prompt2='\n'+fileName+'.'+editMode+' is already a file, please choose another name';
                modal.find('p').append('<br/>'+prompt2);
                return;
            }

            var new_file={
                name:newFileName,
                data:'',
            }
            if(fileName!=null)
                FileSystem.newFile(new_file.name, new_file.data, function(data){
                    console.log(data.status + 'new file');
                    displayFile(data);
                    refreshFileList();
                    modal.modal('hide');
                    modal.detach();
                });
            else{
                console.log('null filename, abort');

            }
        });
        
    }
    function deleteFile(path){
        console.log(path);
        addModal('deleteFile', 'Delete File', 'Are you sure you want to delete ' + path+'?', 'Delete File', 'Cancel', function(){
            var confirm = true;
            if(confirm){
                FileSystem.deleteFile(path, function(data){
                    refreshFileList();
                    showDelete(data);
                });
            }
        })
        
    }
    function addModal(id, header, message, confirm, cancel, confirmFunction){
        cancel=cancel||'Cancel';
        confirm=confirm||'Ok';
        var modal=addDiv('modal hide fade').attr({'id': id,});
        var headerDiv=addDiv('modal-header');
        headerDiv.append('<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>');
        headerDiv.append('<h3>'+header+'</h3>');
        var bodyDiv=addDiv('modal-body').append(message);
        var footerDiv=addDiv('modal-footer');
        var buttonDismiss=$('<button>').addClass('btn btn-alert').attr({    
            'data-dismiss':"modal",
            'aria-hidden':true,
        }).append(cancel);

        var buttonConfirm=$('<button>').addClass('btn btn-primary').append(confirm);

        footerDiv.append(buttonDismiss, buttonConfirm);

        modal.append(headerDiv, bodyDiv, footerDiv);

        rootNode.append(modal);

        buttonConfirm.on('click', function(e){
            var modal=$(e.currentTarget).parents('.modal');
            confirmFunction(modal);
        })
        bodyDiv.find('#modal_input').on('keypress', function (e) {
            var key = e.which || e.keyCode;
            if (key == 13) { // 13 is enter
                var modal=$(e.currentTarget).parents('.modal');
                confirmFunction(modal);
            }
        });
        modal.modal('show');
        modal.on('shown', function () {
            buttonConfirm.focus();
            bodyDiv.find('#modal_input').focus();
        })
        return modal;
    }
    function addInputModal(title, confirm, cancel, prompt, input_prepend, confirmFunction){
        var isValid=false;
        var prompt2=' ';
        var innerDiv=addDiv('inner-modal');
        innerDiv.append($('<p>').addClass('firstP').append(prompt));
        var inputDiv = addDiv("input-prepend").append($('<span>').addClass("add-on").append(input_prepend));
        innerDiv.append(inputDiv);
        var input =$('<input>').addClass("span12")
            .attr({
                id:'modal_input',
                type:"text",
                placeholder:"Type Here",
        });
        inputDiv.append(input);
        var id = title.toLowerCase().replace(/(\s|\/|\\)/g, '_');
        addModal(id,title, innerDiv, confirm,cancel,confirmFunction)
    }
    function renameFile(path){
        var file_path = path.slice(0, path.lastIndexOf('/'));
        var prompt='What is the new name of the file you wish to rename?<br/>'+path;
        var isValid=false;
        var fileName='';
        var newFileName='';
        var prompt2='';
        addInputModal('Rename', 'Rename File',null, prompt, FileSystem.getUserName()+file_path+'/', function(modal){
            fileName=modal.find('input').val();
            console.log(fileName+ ' obtained from modal')
            //checks to confirm valid file name
            if(fileName==null){
                console.log('user canceled');
                isValid=false;
                modal.modal('hide');
                modal.detach();
                return;
            }
            
            if(!isValidName(fileRegexp, fileName)){
                prompt2='Invalid Name.<br/> Names cannot be empty or contain \\, \/ , : , " , < , > , | , ? , * , or ~';
                isValid=false;
                modal.find('p').append('<br/>'+prompt2);
                return;
            }

            if(fileName.indexOf('.')<0)
                newFileName=file_path+'/'+fileName+'.'+editMode;
            else
                newFileName=file_path+'/'+fileName;
            

            if (FileSystem.isFile(newFileName)){
                prompt2='\n'+fileName+'.'+editMode+' is already a file, please choose another name';
                modal.find('p').append('<br/>'+prompt2);
                return;
            }

            var new_file={
                name:newFileName,
                data:'',
            }
            if(fileName!=null){
                console.log('rename file to ' + newFileName)
                FileSystem.renameFile(path, newFileName , function(data){
                    console.log(data.status + ' new file');
                    displayFile(data);
                    refreshFileList();
                    modal.modal('hide');
                    modal.detach();
                });
            }
            else{
                console.log('null filename, abort');

            }
        })
    }
    function showDelete(data){
        cornerAlert('Deleted', data.name+' has been deleted from your directory','error' );

    }

    function cornerAlert(title, description, type){
        var cornerAlert=addDiv('alert alert-'+type).css({
            'position':'absolute',
            'width':rootNode.width()-40,
            'z-index':10,
        });
        cornerAlert.append($('<button type="button" class="close" data-dismiss="alert" href=#>&times;</button>'
            +'<div><strong>'+title+'!</strong><br/> '+description+'</div>'));

        rootNode.prepend(cornerAlert);
        cornerAlert.fadeOut(3000, function(){cornerAlert.detach();});
    }

    function commit(){
    }
    function setup(root, editorN, mode){
        rootNode=$(root);
        editor=editorN;
        editMode=mode;
        //editorWrapper=addDiv('span10 folderStruct');
        var buttonDiv=addDiv('btn-group group1 buttonDiv');
        addButtons(buttonDiv);

        sideBarNav=addDiv('sidebar-nav');
        var filesWrapper=$('<ul>').addClass('filePaths nav nav-list nav-stacked');
        
        sideBarNav.append(filesWrapper);

        var tempName=$("<div class='header '><h1 class='testDiv'>testing</h1>");
        //     +"<button class='btn btn-info' id='user_button'>get filelist</button></div>");
        
        // rootNode.append(tempName);

        var username = FileSystem.getUserName();
        
        rootNode.append(buttonDiv);
        rootNode.append(sideBarNav);

        $('.btn').tooltip({
            'placement': 'bottom', 
            container:'body'
        });
    }
    function addDiv(classes){
        if(!classes)
            classes='';
        return $('<div></div>').addClass(classes);
    }
    function addButtons(buttonDiv){   
        var hideButton=$('<button></button>').addClass('btn hideNavBar').attr({
                'data-toggle':"tooltip", 
                'title':"Hide Folders",
                'data-trigger':'hover'
                });
        hideButton.append('<i class=icon-chevron-left></i>');
        buttonDiv.append(hideButton);
        // var newFolderButton=$('<button></button>').addClass('btn newFolder').attr({
        //         'data-toggle':"tooltip", 
        //         'title':"New Folder file",
        //         'data-trigger':'hover'
        //         });
        // newFolderButton.append('<i class=icon-folder-open></i>');
        // buttonDiv.append(newFolderButton);
        var refreshButton=$('<button></button>').addClass('btn refresh').attr({
                'data-toggle':"tooltip", 
                'title':"Refresh",
                'data-trigger':'hover'
                });
        refreshButton.append('<i class=icon-refresh></i>');
        buttonDiv.append(refreshButton);
        // var saveAllButton=$('<button></button>').addClass('btn save_all').attr({
        //         'data-toggle':"tooltip", 
        //         'title':"Save All",
        //         'data-trigger':'hover'
        //         });
        // saveAllButton.append('<i class=icon-gift></i>');
        // buttonDiv.append(saveAllButton);
        var commitButton=$('<button></button>').addClass('btn commit').attr({
                'data-toggle':"tooltip", 
                'title':"Commit and Close", 
                'data-trigger':'hover'
                });
        commitButton.append('<i class=icon-off></i>');
        buttonDiv.append(commitButton);

        //writing listeners
        refreshButton.on('click', function(e){
            $('.filePaths').html('');
            refreshFileList();
        });
        hideButton.on('click', function(e){
            hideNavBar();
        });
        // newFolderButton.on('click', function(e){
            
        //     newFolder('/');
        // });

        //now adding editor buttons
        editor.addButtonGroup([new ToolbarButton('show folders',showNavBar, '')]);

    }
    
    // function hideNavBar(){
    //     rootNode.css('display', 'none');
    //     rootNode.parent().find('.span9').addClass('span12').removeClass('span9');
    // }
    // function showNavBar(){
    //     rootNode.css('display', 'block');
    //     rootNode.parent().find('.span12').addClass('span9').removeClass('span12');
    // }
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
    return {setup:setup, refresh:refreshFileList};
}();




