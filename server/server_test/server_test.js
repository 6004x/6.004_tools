$(document).ready(
	function(){
		console.log('ready, asking server');
		if(window.File && window.FileReader && window.FileList && window.Blob){
			console.log('filereader identified');
			var img;
			var req=$.ajax({
	                url:'http://localhost:8080/download/sword.png', 
	                data:{'username':'dontony'}
	            });
		      req.done(function(msg){
		      	console.log('returned');
		        img=msg;
		        displayImg(img);
		      });
	  	}
	  	else{
	  		console.log('no file reader');
	  	}
	}
);

function displayImg(img){
	//var inp=$('<input type=file id=fileinput></input>');
	var image = $('<img></img>');

	$('.testDiv').append(image);
	console.log('testdiv added');
	console.log(img);
	console.log(img.name);

}