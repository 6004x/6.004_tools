var sys = require("sys");
var url=require('url');
var qs = require('querystring');
var filesys = require('fs');
var path=require('path');

my_http = require("http");

my_http.createServer(function(request,response){  
    sys.puts("I got kicked"); 
    var root_path=process.cwd();
    var user_path, full_path;
    var file_path = unescape(url.parse(request.url).pathname);

    var data=qs.parse(request.url);
    var user=data['username'];
    var query=data['query'];
    // console.log(data);
    // console.log(root_path);
    // sys.puts(user);
    // sys.puts(request.url);
    // sys.puts(file_path);
    // sys.puts(query)
    if(user){
      user_path=path.join(root_path, user);
      full_path=path.join(user_path,file_path);
    }  
    
    sys.puts(full_path);

    if(query!='saveFile'){
      filesys.exists(full_path, function(exists){
        if(!exists){
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
            send_json(JSON.stringify(fileList));
          }
          else if (query==='getFile'){
            console.log(full_path);
            filesys.exists(full_path,function(exists) {
              if (exists){
                console.log('send_file');
                send_file(file_path, full_path);

              } 
              else {
              // it's not in user's directory, try shared directory
                  /*full_path = shared_dir + path;
                  fs.exists(fname,function(exists) {
                    if (exists) send_file(full_path);
                    else {*/
                        // library not found, send empty one
                        send_json('{}');
                   /* }
                  });*/
                  }
              });
          }
        }
           
      });
  }else{
    var fdata=qs.parse(request.url)['fdata'];
    filesys.exists(user_path, function(exists){
      if(exists){
        filesys.exists(full_path, function(exists){
            save_file(file_path, full_path, fdata);
        });
      }
      else{
        filesys.mkdirSync(full_path);
        //TODO FIX THIS PATH 
      }
    });
  }

  function recurseThroughFolders(curr_path){
      console.log(curr_path);
      console.log('line 98');
      var files=filesys.readdirSync(curr_path);
      var fileList={};
      for(var i=0; i <files.length; i++){
          var name = files[i];
          if(name.indexOf('.')<0){
            var new_path = path.join(curr_path, name)
            console.log(new_path)
            fileList[name]= recurseThroughFolders(new_path);

            //synchronois return of list of subfiles, only need to go one level down
          }else{
            fileList[name]=[];
          }

        }
        console.log('line 114');
      console.log(fileList);
      return(fileList);
  }
  

  function send_json(data) {
      response.writeHead(200,{
        'Content-Length': data.length,
        'Content-Type': 'application/json',
        "Access-Control-Allow-Origin":'*'
            });
      console.log(data);
      response.end(data);
      console.log('data sent');
    }
    function send_file(file_path, full_path) {
      filesys.readFile(full_path,'utf8',function(err,data) {
        if (err){console.log(err);
          throw err;
        }
        send_json(JSON.stringify({
          name:file_path,
          data:data,
        }));
      });
    }
    function save_file(file_path, full_path, fdata) {
      filesys.writeFile(full_path, fdata, 'utf8', function (err) {
        if (err){
          send_json(JSON.stringify({
            name:file_path,
            status:'not saved',
            data:fdata,
          }));
        }
        console.log(fname+ ' saved!');
        send_json(JSON.stringify({
          name:file_path,
          status:'saved',
        }));

      });
    }
}).listen(8080);  
sys.puts("Server Running on 8080");