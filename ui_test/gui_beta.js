var GUI=new function(){
    var username;
    var rootNode, editor, sideBarWrapper, editorWrapper;
    var openFiles=[];
    var fileSystem;
    function refreshFileList(){
        getFileList(rootNode.find('.filePaths'));
    }
    function getFileList(parentNode){

        username= $('#user_input').val();
        server_name=$('#server_input').val();

        parentNode.html('');
        console.log(server_name)
        if(server_name!=fileSystem.getServerName())
        {
            console.log(fileSystem.getServerName());
            fileSystem.setup(server_name);
        }
        if(username){
            fileSystem.getFileList(username, function(data, status){
                console.log(data);
                console.log(status);
                addFiles(data, parentNode, '/');
            }, noServer);
        }
        function addFiles(fileList, parentNode, parentPath){
            //testing whether username chenged or not, to change data structure
            
            if (username!=$('.testDiv').text()){
                $('.testDiv').text(username);
                
                console.log('username changed');
            }
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
                            var arrow = sideBarWrapper.find('.folderName a>i ');
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
                            var arrow = sideBarWrapper.find('.folderName a>i ');
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
            fileSystem.getFile(username, fileName, function(file, status){
                console.log(status);
                displayFile(file);
            });
            
        }

    function displayFile(file){
        console.log('files');
        console.log(file.data);
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
            fileSystem.saveFile(username, file, function(file, status){
                console.log(file.name);
                if(file.status=='success')
                    console.log(file.name+' saved!');
                else
                    console.log(file.name+' did not save');
                displaySave(file);
            });
        }

    }

    function setup(root, fileSys){
        rootNode=$(root);
        var wrapper=addDiv().addClass('row-fluid wrapper');
        sideBarWrapper=addDiv().addClass('span2 sideBarWrapper');
        editorWrapper=addDiv().addClass('span10 folderStruct');

        var buttonDiv=addDiv().addClass('btn-group group1 buttonDiv');
        addButtons(buttonDiv);

        sideBarNav=addDiv().addClass('sidebar-nav');
        var filePaths=$('<ul></ul>').addClass('nav nav-list nav-stacked filePaths');
        sideBarNav.append(filePaths);

        sideBarWrapper.append(buttonDiv);
        sideBarWrapper.append(sideBarNav);

        
        var rowOne=addDiv().addClass('row').append(sideBarWrapper).append(editorWrapper);
        wrapper.append(rowOne);
        var tempName=$("<h1 class='testDiv'>testing</h1>USERNAME:"
            +"<input id = 'user_input' type='text' title='username'></input>"
            +"SERVER:<input id = 'server_input' type='text' title='server'></input>"
            +"<button class='btn btn-info' id='user_button'>get filelist</button>"
            +"<div class = 'modeButtons btn-group'>"
            +"<button class='btn btn-success' id='jsim'><img src=js.png></img>IM</button>"
            +"<button class='btn btn-success' id='bsim'><em>&beta;</em>sim</button>"
            +"<button class='btn btn-success' id='tmsim'>TMsim</button></div>");
      

        rootNode.append(tempName);

        fileSystem=fileSys;
        setSyntax();
        rootNode.append(wrapper);
        
        $('#user_button').on('click', function(e){
                console.log('button');
                rootNode.find('.filePaths').html('');
                refreshFileList();
            });
        $('#jsim').on('click', function (e){setSyntax('jsim');});
        $('#bsim').on('click', function (e){setSyntax('bsim');});
        $('#tmsim').on('click', function (e){setSyntax('tmsim');});

        $('.btn').tooltip({'placement': 'bottom'});
        rootNode=wrapper;
    }
    function addDiv(){
        return $('<div></div>');
    }
    function setSyntax(mode){
        mode=mode||'jsim';
        console.log(mode);
        editorWrapper.html('');
        editor = new Editor(editorWrapper, 'jsim');
        editor.addButtonGroup([new ToolbarButton('Run', _.identity, 'Runs your program!'), 
            new ToolbarButton('Export'), 
            new ToolbarButton('Save', saveCurrentFile, 'Saves the current File')]);

        editor.addButtonGroup([new ToolbarButton('show folders',showNavBar, '')]);



        var set_height = function() {
                editor.setHeight(document.documentElement.clientHeight - 70); // Set height to window height minus title.
        }
        set_height();
        $(window).resize(set_height);
        if(openFiles.length>0)
            $.each(openFiles, function(i, file){
                console.log(i)
                console.log(file)
                editor.openTab(file.name, file.data, true);
            });

    }
    function addButtons(buttonDiv){   
            var buttonZero=$('<button></button>').addClass('btn hideNavBar').attr({
                    'data-toggle':"tooltip", 
                    'title':"HIde Folders",
                    'data-trigger':'hover'
                    });
            buttonZero.append('<i class=icon-chevron-left></i>');
            buttonDiv.append(buttonZero);
            var buttonOne=$('<button></button>').addClass('btn newFolder').attr({
                    'data-toggle':"tooltip", 
                    'title':"New Folder file",
                    'data-trigger':'hover'
                    });
            buttonOne.append('<i class=icon-folder-open></i>');
            buttonDiv.append(buttonOne);
            var buttonTwo=$('<button></button>').addClass('btn refresh').attr({
                    'data-toggle':"tooltip", 
                    'title':"Refresh",
                    'data-trigger':'hover'
                    });
            buttonTwo.append('<i class=icon-refresh></i>');
            buttonDiv.append(buttonTwo);
            // var buttonThree=$('<button></button>').addClass('btn save_all').attr({
            //         'data-toggle':"tooltip", 
            //         'title':"Save All",
            //         'data-trigger':'hover'
            //         });
            // buttonThree.append('<i class=icon-gift></i>');
            // buttonDiv.append(buttonThree);
            var buttonFour=$('<button></button>').addClass('btn commit').attr({
                    'data-toggle':"tooltip", 
                    'title':"Commit and Close", 
                    'data-trigger':'hover'
                    });
            buttonFour.append('<i class=icon-off></i>');
            buttonDiv.append(buttonFour);
            buttonTwo.on('click', function(e){
                $('.filePaths').html('');
                refreshFileList();
            });
            buttonZero.on('click', function(e){
                hideNavBar();
                console.log('hide');
            });
            buttonOne.on('click', function(e){
                newFolder();
                console.log('new');
            })
    }
    function addModals(){

    }
    function newFolder(){
        var folderName=window.prompt('What is the name of the new folder you wish to make');
        fileSystem.newFolder(username, folderName, function(file, status){
            console.log(status);
                refreshFileList();
        });
    }
    function newFile(file_path){
        var valid=false;
        var fileName='';
        while(!valid){
           fileName=window.prompt('What is the name of the new file you wish to make?\n it must contain a filetype');
           if(fileName.indexOf('.')>0&&fileName.length>0&&fileName.indexOf('.')<(fileName.length-3))
                valid=true;
        }        var new_file=new Object();
        new_file.name=file_path+fileName;
        new_file.data='';
        fileSystem.newFile(username, new_file, function(data, status){
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
    function hideNavBar(){
        sideBarWrapper.css('position', 'relative');
        var width=-(sideBarWrapper.width());

        console.log(width);
        sideBarWrapper.animate({'left' :width}, 500, 'swing', function(){
                sideBarWrapper.detach()
                addFifthButton();

        });
        var offset=-editorWrapper.offset().left+parseInt(editorWrapper.css('margin-left'));
        editorWrapper.animate({'left' :offset}, 500, 'swing', function(){
            editorWrapper.removeClass('span10');
            editorWrapper.css('left', 0);
        });

        function addFifthButton(){
            

        }
    }
    function showNavBar(){
        if(sideBarWrapper.parent().length==0){
            console.log(sideBarWrapper.parent());
            rootNode.find('.row').prepend(sideBarWrapper);    
            var width=(sideBarWrapper.width());
            editorWrapper.addClass('span10');
            editorWrapper.css('left', -width);
            console.log(width);
            editorWrapper.removeClass('float-right');
            
            sideBarWrapper.animate({'left' :0}, 500, 'swing', function(){
                
            });
            editorWrapper.animate({'left' :0}, 500, 'swing', function(){
                
            });
        }
    }
    function commit(){
        console.log('commited?');
    }

    return {setup:setup};
}();


$(document).ready(function (){
    

    fileSystem.setup('http://localhost:8080');
    GUI.setup('.wrapperDiv', fileSystem);
    $('#user_input').val('dontony');
    $('#server_input').val('http://localhost:8080');
    
});
        

