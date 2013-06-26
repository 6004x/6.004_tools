var GUI=new function(){
    var username;
    var rootNode, editor, sideBarWrapper, editorWrapper;
    function getFileList(parentNode, path){

        console.log(path)
        username= $('#user_input').val();
        
        if(username){
            console.log(username);
            var req=$.ajax({
                url:'http://localhost:8080/'+path, 
                data:{'user':username, 'query':'filelist', 'username':username}
            });
            req.done(function(fl){return addFiles(fl, parentNode, path)});
        }
    }
    var i=0; //counter for collapse indicators
    function addFiles(fileList, parentNode, parentPath){
        //testing whether username chenged or not, to change data structure
        if (username!=$('.testDiv').text()){
            $('.testDiv').text(username);
            parentNode.html('');
            console.log('username changed');
            i=0;
        }

        
        $.each(fileList, function(name, subList) {
            
            var collapseName='collapse'+name.replace(' ','_');
            //collapseName is name without whitespace

            if(subList.length==0){
                console.log('.');
                var listVar=$('<li></li>').attr('data-parent', parentPath).append('<a href=#>'+name+'</a>');
                listVar.on('click', getFile);
                parentNode.append(listVar);
            }
            else{
                
                addSubFolder(parentNode, parentPath, collapseName, name, subList)
            }

        });
    }


    function addSubFolder(parentNode, parentPath, collapseName, folderName, subList){
        var collapserDiv=addDiv().addClass('folderContents');
        var collapser=$('<li class=folderName data-toggle=collapse href=#'+collapseName+'></li>');
        collapserDiv.append(collapser);

        collapser.append('<a >'+'<i class="icon-minus float-left open_indicator"></i>'+folderName+'</a>');
        collapser.find('i').addClass(collapseName+'_collapser')

        var subListUL=$('<ul id='+collapseName+' class ="collapse in"></ul>');
        //subListUL.addClass('folderContents');
        subListUL.on('shown', function(e){
            var arrow = collapser.find('.'+collapseName+'_collapser');
            if(arrow.hasClass('icon-plus')){
                arrow.addClass('icon-minus')
                arrow.removeClass('icon-plus')
            }                            
        });
        subListUL.on('hidden', function(e){
            var arrow = collapser.find('.'+collapseName+'_collapser');
            console.log(arrow);
            if(arrow.hasClass('icon-minus')){
                arrow.addClass('icon-plus');
                arrow.removeClass('icon-minus');
            }
        });
        var foldered=false;
        $.each(subList, function(i, sub_name){
                var listVar=$('<li></li>').attr('data-parent',parentPath+'/'+folderName);           
                if(sub_name.indexOf('.')>-1){
                    listVar.append('<a href=# >'+sub_name+'</a>');
                    listVar.on('click', getFile);
                    subListUL.append(listVar);
                }
                else if(!foldered){
                    getFileList(listVar, parentPath+'/'+folderName);
                    foldered=true;
                    subListUL.append(listVar);
                }else
                    console.log('foldered');
            });
        collapserDiv.append(subListUL)
        parentNode.append(collapserDiv);

    }
    function getFile(e){
            var node=$(e.target);
            var fileName=unescape(node.text());
            var folderName=unescape(node.parent().attr('data-parent'));
            console.log(folderName==null);
            if(folderName!='undefined'){
                fileName=folderName+'/'+fileName;
            }

            console.log(folderName+'/'+fileName);
            var req=$.ajax({
                    url:'http://localhost:8080/'+fileName, 
                    data:{'user':username, 'query':'file', 'username':username},
                    dataType:'text'                  
            });
            req.done(function(msg){displayFile(msg, fileName);});
            req.always(function(r, text){
                console.log(text);
            })

        }

    function displayFile(msg, path){
        console.log('files');
        // $('.toDisplay').val(msg);

        editor.openTab(path, msg, true);

    }


    function setup(root){
        rootNode=$(root);
        var wrapper=addDiv().addClass('row-fluid wrapper');
        sideBarWrapper=addDiv().addClass('span2');
        editorWrapper=addDiv().addClass('span10 folderStruct');

        var buttonDiv=addDiv().addClass('btn-group group1');
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
        var buttonThree=$('<button></button>').addClass('btn save_all').attr({
                'data-toggle':"tooltip", 
                'title':"Save All",
                'data-trigger':'hover'
                });
        buttonThree.append('<i class=icon-gift></i>');
        buttonDiv.append(buttonThree);
        var buttonFour=$('<button></button>').addClass('btn commit').attr({
                'data-toggle':"tooltip", 
                'title':"Commit and Close",
                'data-trigger':'hover'
                });
        buttonFour.append('<i class=icon-off></i>');
        buttonDiv.append(buttonFour);

        sideBarNav=addDiv().addClass('sidebar-nav');
        var filePaths=$('<ul></ul>').addClass('nav nav-list nav-stacked filePaths');
        sideBarNav.append(filePaths);

        sideBarWrapper.append(buttonDiv);
        sideBarWrapper.append(sideBarNav);

        editor = new Editor(editorWrapper, 'tsim');
        editor.addButtonGroup([new ToolbarButton('Run', _.identity, 'Runs your program!'), new ToolbarButton('Export')]);
        editor.openTab('foo.uasm', 'This is a file!');
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
            getFileList(rootNode.find('.filePaths'), '');
        });
            
        $('.refresh').on('click', function(e){
                $('.filePaths').html('');
                getFileList(rootNode.find('.filePaths'), '');
            });
        $('.btn').tooltip({'placement': 'bottom'});

    }
    function addDiv(){
        return $('<div></div>');
    }
    
    return {setup:setup};
        
}();


$(document).ready(function (){
    GUI.setup('.wrapperDiv');
});
        

