var sys = require('sys');
var url=require('url');
var qs = require('querystring');
var fs = require('fs');
var path=require('path');

my_http = require("http");

my_http.createServer(function(request,response){

    var root_path=process.cwd();
    var lib_path=path.join(root_path, 'libraries')
    var user_path, full_path, shared_path;

    var file_path = unescape(url.parse(request.url).pathname);
    var data=qs.parse(request.url);
    var user=data['username'];
    var query=String(data['query']);
    // console.log(data);
    // console.log(root_path);
    // sys.puts(request.url);
    // sys.puts(file_path);
    if(user){
        user_path=path.join(lib_path, user);
        shared_path=path.join(lib_path, 'shared')
        full_path=path.join(user_path,file_path);
    }  
    
    sys.puts(user + ' wants ' + query);

    if(query==='getFile'||query==='filelist'){
        console.log('file path is '+ full_path);
        fs.exists(full_path, function(exists){
            if(!exists){
              if(query==='getFile'){
                // it's not in user's directory, try shared directory
                shared_file = path.join(shared_path, file_path);
                fs.exists(shared_file,function(exists) {
                  if (exists) send_file(shared_file);
                  else {
                      // library not found, send empty one
                      send_json('{}');
                  }
                });
              }
              response.writeHeader(404, 
              {
                "Content-Type": "text/plain",
                "Access-Control-Allow-Origin":'*'
              });
              response.write('404 not found');
              response.end();
            }
            else{
                if(query==='filelist'){
                    // no file name, return directory listing
                    var fileList=recurseThroughFolders(full_path);
                    console.log('returned from fileList');
                    send_json(fileList);
                  }
                else if (query==='getFile'){
                    console.log(full_path);
                    console.log('send_file');
                    send_file(file_path, full_path);
                      
                }
               
            }
        });
    }
    else if (query=='saveFile'||query=='newFile'){
        var fdata=qs.parse(request.url)['fdata'];
        fs.exists(path.dirname(full_path), function(exists){
            if(exists){
            fs.exists(full_path, function(exists){
                save_file(file_path, full_path, fdata);
            });
            }
            else {
                console.log('does not exist');
                var pathdiff=path.relative(full_path, user_path);
                console.log(pathdiff);
                console.log(full_path);
                //do something with patthdiff...
                fs.mkdir(path.dirname(full_path), function(err){
                    if(err){
                        console.log(err);
                        send_json({name:file_path,status:'failed',error:err})
                    } else {
                        save_file(file_path, full_path, fdata);
                    }
                });
            }
        });
    } else if (query=='newFolder'){
        fs.exists((full_path), function(exists){
            if(exists){
                console.log('path already exists at '+ file_path);
            }else{
                console.log('mkdir path');
                fs.mkdir((full_path), function(err){
                    if(err){
                      console.log(err);
                    } else {
                      console.log('didn\'t fail');
                      send_json({user_path:user_path, status:'created'});
                    }
                });
            }
        });
      }

  function recurseThroughFolders(curr_path){
      //console.log(curr_path);
      var files=fs.readdirSync(curr_path);
      var fileList={};
      for(var i=0; i <files.length; i++){
          var name = files[i];
          if(name.indexOf('.')<0){
            var new_path = path.join(curr_path, name)
            fileList[name]= recurseThroughFolders(new_path);

            //synchronois return of list of subfiles, only need to go one level down
          }else{
            fileList[name]=[];
          }

        }
      return(fileList);
  }
  

  function send_json(data) {
      var sdata= JSON.stringify(data);
      response.writeHead(200,{
        'Content-Length': sdata.length,
        'Content-Type': 'application/json',
        "Access-Control-Allow-Origin":'*'
            });
      console.log(sdata);
      response.end(sdata);
      console.log('data sent');
    }
  function send_file(file_path, full_path) {
    fs.readFile(full_path,'utf8',function(err,data) {
      if (err){
        console.log(err);
        throw err;
      }
      send_json({
        name:file_path,
        data:data,
        status:'success',
      });
    });
  }
  function save_file(file_path, full_path, fdata) {
    fs.writeFile(full_path, fdata, 'utf8', function (err) {
      if (err){
        sys.puts(err);
        send_json({
          name:file_path,
          status:'failed',
          data:fdata,
          error:err,
        });
      }else{
        console.log(file_path+ ' saved!');
        send_json({
          name:file_path,
          status:'success',
        });
      }
    });
  }
  function create_user_path(after) {
  fs.exists(user_path,function(exists) {
    if (!exists)
        fs.mkdir(user_path,function(err) {
          if (err) throw(err);
          after();
      });
    after();
    });
  }
}).listen(8080);  
sys.puts("Server Running on 8080");
console.log(__dirname);