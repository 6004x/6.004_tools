var TMSIM = function(){

}

var TSM=function(){
	var curr_state;
	var list_of_states;

}

var Tape=function(){
	var 
}



function LinkedList(){
	var self=this;
	var first;
	var last;
	var size=0;

	//attaches a node with data as the last pointer of the LL
	this.append=function(data){

		if(first==null){
			first=new llnode(data);
			last=first;
			first.next=last.next=null;
			first.prev=last.prev=null;
		}
		else{
			var temp= new llnode(data);
			last.next.prev=last;
			last=last.next;
			last.next=null;
		}
		size++;
		return self;
	}

	//attaches a node with data as the first pointer of the LL
	this.prepend=function(data){

		if(first==null){
			first=new llnode(data);
			last=first;
			first.next=last.next=null;
			first.prev=last.prev=null;
		}
		else{
			var temp = new llnode(data);
			temp.next=first;
			temp.prev=null;
			first=temp;
		}
		size++;
		return self;
	}

	//finds first instance of this data and removes it
	this.remove=function(data){
		if(size==0)
			return false;
		else{
			printLL();
			var current=first;
			while(current!=null){
				if(current.data==data){
					//then this node is the one we must delete
					if(current.prev){
						//there exists a previous node, is not the first node
						current.prev.next=current.next;
						current.next.prev=current.prev;
						console.log('deleted');
						console.log(current);
						size--;
						printLL();
						return self;
					}else{
						first=first.next;
						first.prev=null;
						size--;
						printLL();
						console.log('deleted first');
						return self;
					}
				}
				current=current.next;
			}
			console.log(data+' not found');
			return self;
		}
	}

	this.printLL=function(){
		var current=first;
		var arrayLL=[];
		while(current!=null){
			arrayLL.push(current);
			current=current.next;
		}
		console.log(arrayLL);
	}

	function llnode(newData){
		this.data=newData;
		this.next=null;
		this.prev=null;
	}
}


var LL1=new LinkedList();
var LL2=new LinkedList();
var LL3=new LinkedList();

LL1.append('s').prepend('r').append('t').prepend('q').prepend('a').prepend('p').remove('a').append('u');

console.log(LL1);
LL1.printLL;

LL2.append('1').remove('2').remove('1').remove('1').append('3');
LL2.printLL
