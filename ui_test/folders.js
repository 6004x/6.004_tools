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

        var username=FileSystem.getUserName();           
                $('.testDiv').text(username);
        //fetch the filelist from server, then add the files to the filesystem.
        FileSystem.getFileList(
            function(data){
                console.log(data);
                // fileList=new Object;
                // fileList[username]=data;
                addFiles(data, parentNode, '/');
            }, noServer);

        function addFiles(fileList, parentNode, parentPath){
            //testing whether username chenged or not, to change data structure
            
                
            console.log(fileList);

            
            for(var name in fileList){
                subList=fileList[name];
                var collapseName='collapse'+name.replace(' ','_');
                //collapseName is name without whitespace
               
                if(name.indexOf('.')>-1){
                    var listVar=$('<li></li>').attr('data-path', parentPath).append('<a href=#>'+name+'</a>');
                    listVar.on('click', getFile);
                    parentNode.append(listVar);
                }
                else {
                    //it is a folder, we must go deeper

                        var folderName=name;
                        var collapserDiv=addDiv().addClass('folderContents');
                        var collapser=$('<li class=folderName data-toggle=collapse href=#'+collapseName+'></li>').attr('data-path', parentPath+folderName+'/');
                        collapserDiv.append(collapser);

                        collapser.append('<a >'+'<i class="icon-chevron-down float-left open_indicator"></i>'+folderName+'</a>');
                        collapser.find('i').addClass(collapseName);
                        collapser.append('<span class="btn btn-link new_file pull-right" style="padding:0px"><i class=icon-plus></span>');
                        collapser.find('.new_file').attr({
                                'data-toggle':"tooltip", 
                                'title':"New File in this folder",
                                'data-trigger':'hover',
                                'data-container':'body',
                                });

                        collapser.find('.new_file').on('click', function(e){
                            var current_path=$(e.currentTarget).parent().attr('data-path');
                            newFile(current_path);
                            e.stopPropagation();
                        });

                        
                        var subListUL=$('<ul id='+collapseName+' class ="collapse in"></ul>');

                        subListUL.on('shown', function(e){
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
                        });
                        subListUL.on('hidden', function(e){
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
                        });

                        if(Object.keys(subList).length>0){
                            //if the subfolder has files inside
                            //recursively fill the tree out
                            addFiles(subList, subListUL,parentPath+folderName+'/');
                        }
                        else{
                            //the subfolder has no files inside, it's an empty folder
                            console.log(name+ ' has no sublists');
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
   

    function getFile(e){
            var node=$(e.currentTarget);
            console.log(node);
            var fileName=unescape(node.text());
            var folderName=unescape(node.attr('data-path'));
            console.log(fileName);
            if(folderName!='undefined'){
                fileName=folderName+fileName;
            }
            console.log(fileName);
            FileSystem.getFile(fileName, displayFile);
            
        }

    function displayFile(file){
        console.log('files');
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
        console.log(file);
        if(file.name){
            console.log('trying to save '+file.name);
            FileSystem.saveFile(file, displaySave);
        }

    }

   
    function addModals(){

    }
    function newFolder(){
        var folderName=window.prompt('What is the name of the new folder you wish to make');
        FileSystem.newFolder('/'+folderName, refreshFileList)
    }
    function newFile(file_path){
        var fileName=window.prompt('What is the name of the new file you wish to make');
        var new_file=new Object();
        new_file.name=file_path+fileName+'.'+editMode;
        //todo, either editor.getmode, arbitrary value, or pased in mode
        new_file.data='';
        FileSystem.newFile(new_file, function(data, status){
            console.log(data.status);
            if(data.status=='success'){
                displayFile(new_file);
                refreshFileList();
            }
            else
            {
                alert('not successful');
            }
        });

    }
    function commit(){
        console.log('commited?');
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
                console.log('button');
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
            console.log('hide feature unimplemented');
        });
        newFolderButton.on('click', function(e){
            newFolder();
            console.log('new');
        });

        //now adding editor buttons
        // editor.addButtonGroup([new ToolbarButton('Save', saveCurrentFile, 'Saves the current File')]);

        // editor.addButtonGroup([new ToolbarButton('show folders',showNavBar, '')]);


    }

    function hideNavBar(){
        // sideBarWrapper.css('position', 'relative');
        // var width=-(sideBarWrapper.width());

        // console.log(width);
        // sideBarWrapper.animate({'left' :width}, 500, 'swing', function(){
        //         sideBarWrapper.detach();

        // });
        // var offset=-editorWrapper.offset().left+parseInt(editorWrapper.css('margin-left'));
        // editorWrapper.animate({'left' :offset}, 500, 'swing', function(){
        //     editorWrapper.removeClass('span10');
        //     editorWrapper.css('left', 0);
        // });
        rootNode.css('display', 'none');
    }
    function showNavBar(){
        // if(sideBarWrapper.parent().length==0){
        //     console.log(sideBarWrapper.parent());
        //     rootNode.find('.row').prepend(sideBarWrapper);    
        //     var width=(sideBarWrapper.width());
        //     editorWrapper.addClass('span10');
        //     editorWrapper.css('left', -width);
        //     console.log(width);
        //     editorWrapper.removeClass('float-right');
            
        //     sideBarWrapper.animate({'left' :0}, 500, 'swing', function(){
                
        //     });
        //     editorWrapper.animate({'left' :0}, 500, 'swing', function(){
                
        //     });
        // }
        rootNode.css('display', 'block');
    }

    return {setup:setup};
}();




