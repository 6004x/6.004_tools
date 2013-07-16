function LinkedList(){
	var self=this;
	var first=null;
	var current=null;
	var last=null;
	var size=0;

	//attaches a node with data as the last pointer of the LL
	
	this.init=function(list, currentIndex){
		if(list){
			makeList(list, currentIndex);
		}
		else if (!first) {
		//initialise by adding the first blank node
			this.append('-');
			self.printLL();
			current=first;
		}
		//reset the current node
		return self;
	}
	function makeList(list, currentIndex){
		for (var i = 0; i < list.length; i++){
			self.append(list[i]);
			if(i==currentIndex)
				current = last;
			size++;
		}
		console.log('initiated list');
		console.log('current at '+currentIndex+' with data '+current.data);
	}
	this.traverse =function(write, direction){
		if(current){
			current.data=write;
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
			//list is empty, so we make this node the first and last node
			first=new llnode(data);
			last=first;
			first.next=last.next=null;
			first.prev=last.prev=null;
		}
		else{
			//attach temp node to the first node and make it the first node
			var temp = new llnode(data);
			temp.next=first;
			first.prev=temp;
			temp.prev=null;
			first=temp;
		}
		size++;
		return self;
	}
	this.append=function(data){

		if(first==null){
		//list is empty, so we make this node the first and last node
			first=new llnode(data);
			last=first;
			first.next=last.next=null;
			first.prev=last.prev=null;
		}
		else{
			//attach temp node to be the last node
			var temp= new llnode(data);
			last.next=temp;
			temp.prev=last;
			last=temp;
			last.next=null;
		}
		size++;
		return self;
	}
	//finds first instance of this data and removes it
	this.remove=function(data){
		if(size == 0)
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
		//should not get here
		console.log('error')
		return self;
	}

	this.toArray = function(){
		var tempNode=first;
		var arrayLL=[];
		while(tempNode!=null){
			arrayLL.push(tempNode.data);
			tempNode=tempNode.next;
		}
		return arrayLL;
	}
	this.printLL=function(){
		console.log(self.toArray());
	}
	this.toString = function (){
		var tempNode=first;
		var stringLL = '';
		while(tempNode!=null){
			if(tempNode == current)
				stringLL += '['+tempNode.data+'], ';
			else
				stringLL += ''+tempNode.data+', ';
			tempNode=tempNode.next;
		}
		return stringLL;
	}

	this.getCurrentNode = function(){
		return self.current;
	}
	this.equals=function(otherLL){
		//dependent on access to the other current node... might scrap that for array representation

		mArray = self.toArray();
		tArray = otherLL.toArray();
		if(mArray.length!=tArray.length){
			console.log('tapes are different size');
			return false;
		}
		var equalArray = true;
		for (var i =0; i < mArray.length; i++){
			if(equalArray)
				equalArray = (mArray[i] == tArray[i]);
		}
		if (equalArray){
			console.log('tapes are the same');
			//now we must traverse and see if current is the same in both.
			var tempMCurr = self.getCurrentNode();
			var tempTCurr = otherLL.getCurrentNode();
			
			if(tempMCurr!=tempTCurr){
				console.log('current node is not the same');
				return false;
			}

			var compare = true;
			while(tempMCurr!=null){
				compare = tempMCurr.data==tempTCurr.data;
				//can we do this?
				if(!compare)
					break;
				tempMCurr = tempMCurr.next;
				tempTCurr = tempTCurr.next
			}
			if(!compare)
				console.log("the two lists don't match");
			return compare;
		}
		console.log(mArray===tArray)
		return false;
	}
	function llnode(newData){
		this.data = newData;
		this.next = null;
		this.prev = null;
	}
	return self;
}


function lltest(){

	var LL1=new LinkedList();
	var LL2=new LinkedList();
	var LL3=new LinkedList();

	LL1.append('s').prepend('r').append('t').prepend('q').prepend('a').prepend('p').remove('a').append('u');
	LL3.append('s').prepend('r').append('t').prepend('q').prepend('a').prepend('p').remove('a').append('u');
	console.log(LL1.equals(LL3));
	console.log(LL3.equals(LL1));
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
	LL3.printLL();

	LL2.append('1').remove('2').remove('1').remove('1').append('3');
	LL2.printLL();
}