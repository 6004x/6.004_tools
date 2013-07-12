function LinkedList(){
	var self=this;
	var first=null;
	var current=null;
	var last=null;
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
			last.next=temp;
			last.next.prev=last;
			last=last.next;
			last.next=null;
		}
		size++;
		return self;
	}

	this.init=function(list){
		if(list){
			makeList(list);
		}
		else{
			this.append('-');
		}

			current=null;
			this.traverse();
	}
	function makeList(list){
		for (var i = 0; i < list.length; i++){
			self.append(list[i]);
		}
	}
	this.traverse =function(new_data, direction){
		if(current){
			// console.log(direction);
			// console.log('current');
			current.data=new_data;
			if(direction === 'l'){
				//move tape left so we must move to next
				current=current.next;
				if(current){
					return current.data;
				} else {
					self.append('-');
					current=last;
					//console.log('we have reached end of line');
					return current.data; //should be '-'
				}
			} else if (direction === 'r'){
				current=current.prev;
				if(current){
					return current.data;
				} else {
					self.prepend('-');
					current=first;
					//console.log('we have reached beginning of line');
					return current.data;
				}
			} else if (direction==='-'){
				console.log('staying put');
				return current.data;
			} else {
				console.log(direction + ' is invalid');
			}
		} else {
			current=first;
			console.log('starting traverse');
			return first.data;
		}
	}
	this.peek=function(){
		//peeks at current;
		return current.data;
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
			first.prev=temp;
			temp.prev=null;
			first=temp;
		}
		size++;
		return self;
	}

	//finds first instance of this data and removes it
	this.remove=function(data){
		if(size==0)
			return self;
		else{
			var tempNode=first;
			while(tempNode!=null){
				// console.log(tempNode);
				if(tempNode.data==data){
					//then this node is the one we must delete
					// console.log(tempNode.prev);
					if(tempNode.prev!=null){
						//there exists a previous node, is not the first node
						tempNode.prev.next=tempNode.next;
						tempNode.next.prev=tempNode.prev;
						// console.log('deleted');
						// console.log(tempNode);
						size--;
						// self.printLL();
						return self;
					}else{
						first=first.next;
						size--;
						if(first)
							first.prev=null;
						// self.printLL();
						// console.log('deleted first');
						return self;
					}
				}
				tempNode=tempNode.next;
			}
			console.log(data+' not found');
			return self;
		}
		console.log('error')
		return self;
	}

	this.printLL=function(){
		var tempNode=first;
		var arrayLL=[];
		while(tempNode!=null){
			arrayLL.push(tempNode.data);
			tempNode=tempNode.next;
		}
		console.log(arrayLL);
	}

	function llnode(newData){
		this.data=newData;
		this.next=null;
		this.prev=null;
	}
}

function lltest(){

	var LL1=new LinkedList();
	var LL2=new LinkedList();
	var LL3=new LinkedList();

	LL1.append('s').prepend('r').append('t').prepend('q').prepend('a').prepend('p').remove('a').append('u');

	// console.log(LL1.traverse('l'));
	// console.log(LL1.traverse('r'));
	// console.log(LL1.traverse('l'));
	// console.log(LL1.traverse('l'));
	// console.log(LL1.traverse('l'));
	// console.log(LL1.traverse('r'));
	// console.log(LL1.traverse('l'));
	// console.log(LL1.traverse('l'));
	// console.log(LL1.traverse('l'));
	// console.log(LL1.traverse('l'));
	// console.log(LL1.traverse('l'));

	LL1.printLL();

	LL2.append('1').remove('2').remove('1').remove('1').append('3');
	LL2.printLL();
}