var GUI=new function(){
    var username;
    var rootNode, editor, sideBarWrapper, editorWrapper;
    var DEFAULT_SERVER='http://localhost:8080';
    var modelFolder;//TODO implement model going ahead

    function getFileList(parentNode){

        username= $('#user_input').val();
        
        if(username){
            sendAjaxRequest('/',null,'json',username, 'filelist', function(fl){addFiles(fl, parentNode,'/');});
        }
    }
    function addFiles(fileList, parentNode, parentPath){
        //testing whether username chenged or not, to change data structure

        if (username!=$('.testDiv').text()){
            $('.testDiv').text(username);
            parentNode.html('');
            console.log('username changed');
        }

        for(var name in fileList){
            subList=fileList[name];
            var collapseName='collapse'+name.replace(' ','_');
            //collapseName is name without whitespace
           
            if(name.indexOf('.')>-1){
                var listVar=$('<li></li>').attr('data-parent', parentPath).append('<a href=#>'+name+'</a>');
                listVar.on('click', getFile);
                parentNode.append(listVar);
            }
            else {
                //it is a folder, we must go deeper

                    var folderName=name;
                    var collapserDiv=addDiv().addClass('folderContents');
                    var collapser=$('<li class=folderName data-toggle=collapse href=#'+collapseName+'></li>');
                    collapserDiv.append(collapser);

                    collapser.append('<a >'+'<i class="icon-minus float-left open_indicator"></i>'+folderName+'</a>');
                    collapser.find('i').addClass(collapseName);

                    var subListUL=$('<ul id='+collapseName+' class ="collapse in"></ul>');

                    subListUL.on('shown', function(e){
                        var id=$(e.currentTarget).attr('id');
                        var arrow = sideBarWrapper.find('.folderName a>i ');
                        arrow=arrow.filter(function(i, e){
                            return $(e).hasClass(id);
                        });
                        if(arrow.hasClass('icon-plus')){
                            arrow.addClass('icon-minus')
                            arrow.removeClass('icon-plus')
                        }                            
                        e.stopPropagation();
                    });
                    subListUL.on('hidden', function(e){
                        var id=$(e.currentTarget).attr('id');
                        var arrow = sideBarWrapper.find('.folderName a>i ');
                        arrow=arrow.filter(function(i, e){
                            return $(e).hasClass(id);
                        });
                        if(arrow.hasClass('icon-minus')){
                            arrow.addClass('icon-plus');
                            arrow.removeClass('icon-minus');
                        }
                        e.stopPropagation();
                    });

                    if(Object.keys(subList).length>0){
                        //if the subfolder has files inside
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
    }

    function getFile(e){
            var node=$(e.currentTarget);
            console.log(node);
            var fileName=unescape(node.text());
            var folderName=unescape(node.attr('data-parent'));
            console.log(fileName);
            if(folderName!='undefined'){
                fileName=folderName+fileName;
            }
            console.log(fileName);
            sendAjaxRequest(fileName,null, 'text', username, 'file', function(file){displayFile(file, fileName);});
        }

    function displayFile(file, path){
        console.log('files');
        editor.openTab(path, file, true);
    }
//current tab is file name
//.content get content of current tab
    function saveCurrentFile(callbackFunction){
        var currentFileName=editor.currentTab();
        var currentFileData=editor.content();
        console.log(currentFileData);
        if(currentFileName){
            console.log('trying to save '+currentFileName);
            sendAjaxRequest(currentFileName, currentFileData,'json', username, 'saveFile', function(fileObj){
                if(fileObj.status=='saved')
                    console.log(fileObj.name+' saved!');
                else
                    console.log(fileObj.name+' did not save');
                callbackFunction(fileObj);
            });
        }
    }

    function setup(root){
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

        editor = new Editor(editorWrapper, 'jsim');
        editor.addButtonGroup([new ToolbarButton('Run', _.identity, 'Runs your program!'), new ToolbarButton('Export'), new ToolbarButton('Save', saveCurrentFile, 'Saves the current File')]);
        editor.addButtonGroup([new ToolbarButton('show folders',showNavBar, '')]);
        //editor.openTab('foo.uasm', 'This is a file!');
        var set_height = function() {
                editor.setHeight(document.documentElement.clientHeight - 70); // Set height to window height minus title.
        }
        set_height();
        $(window).resize(set_height);

        wrapper.append(sideBarWrapper);
        wrapper.append(editorWrapper);
        var tempName=$("<h1 class='testDiv'>testing</h1>INPUT: <input id = 'user_input' type='text' title='username'></input><button class='btn-info' id='user_button'>get filelist</button>");

                

        rootNode.append(tempName);

        rootNode.append(wrapper);
        
        $('#user_button').on('click', function(e){
                console.log('button');
                rootNode.find('.filePaths').html('');
                getFileList(rootNode.find('.filePaths'));
            });
        $('.btn').tooltip({'placement': 'bottom'});
        rootNode=wrapper;
    }
    function addDiv(){
        return $('<div></div>');
    }
    function addButtons(buttonDiv){   
            var buttonZero=$('<button></button>').addClass('btn hideNavBar').attr({
                    'data-toggle':"tooltip", 
                    'title':"HIde Folders",
                    'data-trigger':'hover'
                    });
            buttonZero.append('<i class=icon-chevron-left></i>');
            buttonDiv.append(buttonZero);
            var buttonOne=$('<button></button>').addClass('btn open_file').attr({
                    'data-toggle':"tooltip", 
                    'title':"Open file",
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
                getFileList(rootNode.find('.filePaths'));
            });
            buttonZero.on('click', function(e){
                hideNavBar();
                console.log('hide');
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
            rootNode.prepend(sideBarWrapper);    
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
    
        
    function sendAjaxRequest(filepath, fileData, dataType, username, query, callbackFunction, urlparam){
        url=DEFAULT_SERVER||urlparam; //default server

        if(!fileData)
            fileData='none';

        console.log(fileData);
        console.log(username);
        url+=filepath;

        var req=$.ajax({
                url:url, 
                data:{dummy:'dummy', username:username,query:query, fdata:fileData},
                username:username,
                dataType:dataType,
            });
        req.done(callbackFunction);
        req.fail(failResponse);
        req.always(function(r, status){
                //var func = JSON.parse(r);
                console.log(status);
        });
    }
    function failResponse(req, status, error){
        alert('failed response'+status+'<br/> '+error);
    }

    return {setup:setup};
}();


$(document).ready(function (){
    GUI.setup('.wrapperDiv');
    $('#user_input').val('dontony');
});
        

