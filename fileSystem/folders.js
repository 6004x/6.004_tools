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
        //fileSYstem keeps track of the username


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
                    var listVar=$('<li></li>').attr('data-path', parentPath+name).append($('<a href=#>'+name+'</a>').attr('data-path', parentPath+'/'+name));
                    var delButton=$('<span>').addClass('btn btn-link del_file pull-right').css('padding', '0px').css('height', '18px').append('<i class=icon-minus>');
                    delButton.attr({
                                'data-toggle':"tooltip", 
                                'title':"delete "+name,
                                'data-trigger':'hover',
                                'data-container':'body',
                                });
                    listVar.append(delButton)
                    listVar.on('click', function(e){

                        var node=$(e.currentTarget);
                        // console.log(node.attr('data-path'));
                        // var fileName=unescape(node.text());
                        // var folderName=unescape(node.attr('data-path'));
                        // if(folderName!='undefined'){
                        //     fileName=folderName+fileName;
                        // }
                        getFile(node.attr('data-path'));
                    });
                    delButton.on('click', function(e){
                        console.log('del button');
                        var current_path=$(e.currentTarget).parent().attr('data-path');
                            deleteFile(current_path);
                            e.stopPropagation();
                    });
                    parentNode.append(listVar);
                }
                else {
                    //it is a folder, we must go deeper

                        var folderName=name;
                        var collapserDiv=addDiv().addClass('folderContents');
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
        var alert=addDiv().addClass('alert alert-success');
        alert.append($('<button type="button" class="close" data-dismiss="alert" href=#>&times;</button>'
            +'<div><strong>Saved!</strong> '+file.name+' has been saved successfully</div>'));
        rootNode.prepend(alert);

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

   
    function addModals(){

    }
    function newFolder(){
        var isValid=false;
        var regexp=/(<|>|\:|\"|\||\/|\\|\?|\*|\.)/g
        var prompt='What is the name of the new folder you wish to make?';
        var prompt2=' ';
        while(!isValid){
            var folderName=window.prompt(prompt+prompt2);
            if(folderName==null){
                console.log('user canceled');
                isValid=true;
                return;
            }
            if(isValidName(regexp, folderName)){
                prompt2='\n'+folderName+' is invalid'+'\n Names cannot contain \\,\/,:,",<,>,,|,?,*';
                isValid=false;
            }else{
                isValid=true;
            }
        }
        if(folderName!=null)
            FileSystem.newFolder('/'+folderName, refreshFileList)
        else
            console.log('null foldername, do nothing');
    }

    function isValidName(regexp, name){

        return name.length>0&&!regexp.test(name);
    }
    function newFile(file_path){
        var regexp=/(<|>|\:|\"|\||\/|\\|\?|\*|~)/g
        var prompt='What is the name of the new file you wish to make';
        var isValid=false;
        
        var fileName='';
        var newFileName='';
        var prompt2='';
        while(!isValid){
            fileName=window.prompt(prompt+prompt2);
            if(fileName==null){
                console.log('user canceled');
                isValid=true;
                return;
            }
            
            if(!isValidName(regexp, fileName)){
                prompt2='\n'+fileName+' is invalid'+'\n Names cannot contain \\, \/ , : , " , < , > , | , ? , * , or ~';
                isValid=false;
                continue;
            }

            if(fileName.indexOf('.')<0)
                newFileName=file_path+fileName+'.'+editMode;
            else
                newFileName=file_path+fileName;
            

            if (FileSystem.isFile(newFileName)){
                prompt2='\n'+fileName+'.'+editMode+' is already a file, please choose another name';
                isValid=false;
            }
            else{
                isValid=true;
            }
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
            });
        else
            console.log('null filename, abort');

    }
    function deleteFile(path){
        console.log(path);
    }
    function commit(){
    }
     function setup(root, editorN, mode){
        rootNode=$(root);
        editor=editorN;
        editMode=mode;
        //editorWrapper=addDiv().addClass('span10 folderStruct');
        var buttonDiv=addDiv().addClass('btn-group group1 buttonDiv');
        addButtons(buttonDiv);

        sideBarNav=addDiv().addClass('sidebar-nav');
        var filePaths=$('<ul></ul>').addClass('nav nav-list nav-stacked filePaths');
        
        sideBarNav.append(filePaths);


        
        //var rowOne=addDiv().addClass('row').append(sideBarWrapper).append(editorWrapper);
        //wrapper.append(rowOne);

        var tempName=$("<div class='header buttonDiv'><h1 class='testDiv'>testing</h1>"
            +"<button class='btn btn-info' id='user_button'>get filelist</button></div>");
        
        rootNode.append(tempName);
        rootNode.append(buttonDiv);
        rootNode.append(sideBarNav);


        $('#user_button').on('click', function(e){
                rootNode.find('.filePaths').html('');
                refreshFileList();
            });

        $('.btn').tooltip({'placement': 'bottom'});
    }
    function addDiv(){
        return $('<div></div>');
    }
    function addButtons(buttonDiv){   
        var hideButton=$('<button></button>').addClass('btn hideNavBar').attr({
                'data-toggle':"tooltip", 
                'title':"HIde Folders",
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
            newFolder();
        });

        //now adding editor buttons
        editor.addButtonGroup([new ToolbarButton('Save', saveCurrentFile, 'Saves the current File')]);

        editor.addButtonGroup([new ToolbarButton('show folders',showNavBar, '')]);


    }

    function hideNavBar(){
        rootNode.css('display', 'none');
    }
    function showNavBar(){
        rootNode.css('display', 'block');
    }

    return {setup:setup, refresh:refreshFileList};
}();




