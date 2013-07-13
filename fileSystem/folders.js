var Folders=new function(){
    var rootNode, editor, editorWrapper;
    var openFiles=[];
    var editMode

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
                // fileList=new Object;
                // fileList[username]=data;
                addFiles(data, parentNode, '/');
            }, noServer);

        function addFiles(fileList, parentNode, parentPath){
            //testing whether username chenged or not, to change data structure
                        
            for(var name in fileList){
                subList=fileList[name];
                var collapseName='collapse'+name.replace(' ','_');
                //collapseName is name without whitespace
               
                //TODO: find a way to make this different
                if(name.indexOf('.')>-1){
                    var listVar=$('<li></li>').attr('data-path', parentPath+name).append($('<a href=#>'+name+'</a>').attr('data-path', parentPath+name));
                    var delButton=$('<span>Delete '+name+'</span>').addClass('btn btn-link del_file pull-right').css('padding', '0px').css('height', '18px').append('<i class=icon-trash>');
                    var delDrop=addDiv('dropdown pull-right');
                    var delDropToggle=($('<button class="btn dropdown-toggle" data-toggle="dropdown" href="#"><span class="caret"></span></button>').css('padding', '0px 5px 0px 3px').css('height', '16px'));
                    var delDropUL=$('<ul class="dropdown-menu" role="menu" aria-labelledby="dLabel"></ul>').css('z-index', 20);
                    

                    // delButton.attr({
                    //             'data-toggle':"tooltip", 
                    //             'title':"delete "+name,
                    //             'data-trigger':'hover',
                    //             'data-container':'body',
                    //             });
                    delDrop.append(delDropToggle);
                    delDropUL.append(delButton);
                    delDrop.append(delDropUL);
                    listVar.append(delDrop);
                    listVar.on('click', function(e){

                        var node=$(e.currentTarget);
                        console.log(node);
                        getFile(node.attr('data-path'));
                    });

                    delButton.on('click', function(e){
                        e.stopPropagation();
                        console.log('del button');
                        console.log($(e.currentTarget).parent().parent())
                        var current_path=$(e.currentTarget).parents('li').attr('data-path');
                        console.log(current_path);
                        deleteFile(current_path);
                    });

                    delDropToggle.on('click', function(e){
                        e.stopPropagation();
                        console.log($(e.currentTarget).parent('.dropdown').find('.dropdown-menu').toggle());

                    })
                    parentNode.append(listVar);
                }
                else {
                    //it is a folder, we must go deeper

                        var folderName=name;
                        var collapserDiv=addDiv('folderContents');
                        var collapser=$('<li class=folderName data-toggle=collapse href=#'+collapseName+'></li>').attr('data-path', parentPath+folderName+'/');
                        collapserDiv.append(collapser);

                        collapser.append('<a >'+'<i class="icon-chevron-down pull-left open_indicator"></i>'+folderName+'</a>');
                        collapser.find('i').addClass(collapseName);
                        var newButton=$('<span class="btn btn-link new_file pull-right" style="padding:0px"><i class=icon-plus></span>');
                        collapser.append(newButton);
                        newButton.attr({
                                'data-toggle':"tooltip", 
                                'title':"New File in this folder",
                                'data-trigger':'hover',
                                'data-container':'body',
                                });

                        newButton.on('click', function(e){
                            var current_path=$(e.currentTarget).parent().attr('data-path');
                            newFile(current_path);
                            e.stopPropagation();
                        });

                        
                        var subListUL=$('<ul id='+collapseName+' class ="collapse in"></ul>');

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
                            addFiles(subList, subListUL,parentPath+folderName+'/');
                        }
                        else{
                            //the subfolder has no files inside, it's an empty folder
                            
                            subListUL.append('[empty folder]');
                        }
                        collapserDiv.append(subListUL);
                        parentNode.append(collapserDiv);
                }


            }
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
        openFiles.push({name:file.name, data:file.data});
    }
    function displaySave(file){
        cornerAlert('Saved', file.name+' has been saved successfully', 'success');
    }

    function cornerAlert(title, description, type){
        var cornerAlert=addDiv('alert alert-'+type).css({
            'position':'absolute',
            'width':rootNode.width()-40,
        });
        cornerAlert.append($('<button type="button" class="close" data-dismiss="alert" href=#>&times;</button>'
            +'<div><strong>'+title+'!</strong><br/> '+description+'</div>'));

        rootNode.prepend(cornerAlert);
        cornerAlert.fadeOut(5000, function(){cornerAlert.detach();});
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
            console.log(e);
            var modal=$(e.currentTarget).parents('.modal');
            confirmFunction(modal);
        })
        return modal;
    }
    function newFolder(file_path){
        var isValid=false;
        var regexp=/(<|>|\:|\"|\||\/|\\|\?|\*|\.)/g
        var prompt='What is the name of the new folder you wish to make?';
        var prompt2=' ';
        var innerDiv=addDiv('inner-modal');
        innerDiv.append('<p class=firstP>'+prompt+'</p>');
        innerDiv.append('<div class="input-prepend"><span class="add-on">'+FileSystem.getUserName()+file_path+'</span><input class='
            +'span2" type="text" placeholder="Type Folder Name Here"></div>');

        addModal('newFolder', 'New Folder', innerDiv, 'Create New Folder',null,function(modal){
            var folderName=modal.find('input').val();
            var folderPath=folderName;
            if(folderName==null){
                console.log('user canceled');
                isValid=false;
                modal.modal('hide');
                modal.detach();
                return;
            }
            if(!isValidName(regexp, folderName)){
                prompt2='\n'+folderName+' is invalid'+'\n Names cannot contain \\,\/,:,",<,>,,|,?,*';
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
        }).modal('show');
    }

    function isValidName(regexp, name){
        var regMatch=name.match(regexp);
        return name.length > 0 && ! regMatch;
    }
    function newFile(file_path){
        var innerDiv=addDiv('inner-modal');

        var regexp=/(<|>|\:|\"|\||\/|\\|\?|\*|~)/g;
        var prompt='What is the name of the new file you wish to make';
        var isValid=false;
        innerDiv.append('<p class=firstP>'+prompt+'</p>');
        innerDiv.append('<div class="input-prepend"><span class="add-on">'+FileSystem.getUserName()+file_path+'</span><input class='
            +'span2" type="text" placeholder="Type File Name Here"></div>');
        var fileName='';
        var newFileName='';
        var prompt2='';
        addModal('newFile', 'New File', innerDiv, 'Create New File',null,function(modal){
            fileName=modal.find('input').val();
            console.log(fileName+ ' obtained from modal')

            if(fileName==null){
                console.log('user canceled');
                isValid=false;
                modal.modal('hide');
                modal.detach();
                return;
            }
            
            if(!isValidName(regexp, fileName)){
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
        }).modal('show');
        
    }
    function deleteFile(path){
        console.log(path);
        var confirm=window.confirm('are you sure you want to delete '+path+'?');
        if(confirm){
            FileSystem.deleteFile(path, function(data){

                refreshFileList();
                showDelete(data);
            });
        }
    }
    function showDelete(data){
        cornerAlert('Deleted', data.name+' has been deleted from your directory','error' );

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
        var filePaths=$('<ul></ul>').addClass('nav nav-list nav-stacked filePaths');
        
        sideBarNav.append(filePaths);

        var tempName=$("<div class='header buttonDiv'><h1 class='testDiv'>testing</h1>"
            +"<button class='btn btn-info' id='user_button'>get filelist</button></div>");
        
        rootNode.append(tempName);
        rootNode.append(buttonDiv);
        rootNode.append(sideBarNav);



        $('#user_button').on('click', function(e){
                rootNode.find('.filePaths').html('');
                refreshFileList();
            });

        $('.btn').tooltip({'placement': 'bottom', container:'body'});
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
        var newFolderButton=$('<button></button>').addClass('btn newFolder').attr({
                'data-toggle':"tooltip", 
                'title':"New Folder file",
                'data-trigger':'hover'
                });
        newFolderButton.append('<i class=icon-folder-open></i>');
        buttonDiv.append(newFolderButton);
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
        newFolderButton.on('click', function(e){
            
            newFolder('/');
        });

        //now adding editor buttons
        editor.addButtonGroup([new ToolbarButton('Save', saveCurrentFile, 'Saves the current File'),new ToolbarButton('show folders',showNavBar, '')]);
        editor.addButtonGroup([new ToolbarButton('TMSim assemble', tmsimAssemble, '')])



    }
    function tmsimAssemble(){
        var file=new Object();
        file.name=editor.currentTab();
        file.data=editor.content();
        if(file.name){
            var parsedDict = TMSIM.parse(file.data);
            editor.openTab(file.name+'parsed', JSON.stringify(parsedDict), true);

            var parsedTSM = TMSIM.developMachine(parsedDict);
            editor.openTab(file.name+'tsmed', JSON.stringify(parsedTSM), true);

            var tsm = new TSM().setup(parsedTSM);
            tsm.start();
        }
    }
    function hideNavBar(){
        rootNode.css('display', 'none');
    }
    function showNavBar(){
        rootNode.css('display', 'block');
    }

    return {setup:setup, refresh:refreshFileList};
}();




