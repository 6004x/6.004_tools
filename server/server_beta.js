var sys = require("sys");
var url=require('url');
var qs = require('querystring');
var filesys = require('fs');
var path=require('path');

my_http = require("http");

my_http.createServer(function(request,response){  
    sys.puts("I got kicked"); 

    
    var pathname = unescape(url.parse(request.url).pathname);
    var user=qs.parse(request.url)['username'];
    var query=qs.parse(request.url)['query'];
    sys.puts(user);
    sys.puts(request.url);
    if(user)
      var full_path=path.join(process.cwd(), user, pathname);
    
    sys.puts(full_path);
    
   
       
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
              filesys.readdir(full_path,function(err,files) {
                if (err) 
                  console.log(err);//TODO why is next there
                console.log(files)
                var fileList={}
                for(var i=0; i <files.length; i++){
                  var name = files[i];
                  if(name.indexOf('.')<0){
                    var new_path = path.join(full_path, name)
                    console.log(new_path)
                    fileList[name]= filesys.readdirSync(new_path);
                    //synchronois return of lsit of subfiles, only need to go one level down
                  }else{
                    fileList[name]=[];
                  }

                }
                console.log(fileList);

                send_json(JSON.stringify(fileList));
            });
          }
          else if (query==='file'){
            console.log(full_path);
            filesys.exists(full_path,function(exists) {
              if (exists){
                console.log('send_file');
                send_file(full_path);

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
          else if(pathname.indexOf('upload')>-1)
          {
            console.log('upload');

          }
        }
           
      });
    
    

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
    function send_file(fname) {
      filesys.readFile(fname,'utf8',function(err,data) {
        if (err){console.log(err);
          next(err);
        }
        send_json(data);
      });
    }
}).listen(8080);  
sys.puts("Server Running on 8080");