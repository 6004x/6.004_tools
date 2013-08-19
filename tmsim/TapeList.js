function TapeList(){
	var self = this;
	var first = null;
	var current = null;
	var previous = null; //saves the previous current node, keeps track of last written
	var last = null;
	var size = 0;
	self.name = '';

	/*
		Node component og the tapeList, each tapelist will have a linked list
		of each tlnode, with a 'current' pointing towards the current traversal. 
	*/
	function tlnode(newData){
		this.data = newData;
		this.next = null;
		this.prev = null;
	}

	/*
		if they give us a list (in exported array form), then initialize the list
		with such contents. If there isn't a list provided, initalize the list with
		a blank '-' node. 
	*/
	this.init = function(name, listArray, currentIndex){
		self.name = name;
		if(listArray){
			makeList(listArray, currentIndex);
		}
		else if (!first) {
		//initialise by adding the first blank node
			this.append('-');
			current = first;
		}
		return self;
	}
	//Takes in an array and exports is as a Linked  TapeList
	function makeList(listArray, currentIndex){

		for (var i = 0; i < listArray.length; i++){
			self.append(listArray[i]);
			if(i == currentIndex)
				current = last;
		}
	}
	/*
		takes in a write symbol and a direction. 
		Writes the symbol to the current node as current.data
		Moves the current node opposite the direction specified, 
		so as to move the whole tape in the direction specified. 
		if there isn't a next/previous node, appends it/prepends it
		and moves to it. this method has the ability to expand the list 
		very far along. 
	*/
	this.traverse = function(write, direction){
		if(current){
			previous = current;
			current.data = write;
			if(direction === 'l'){
				//move tape left so we must move to next
				current = current.next;
				if(current !== null){
					return current.data;
				} else {
					self.append('-');
					current = last;
					// we have reached end of line
					return current.data; //should be '-'
				}
			} else if (direction === 'r'){
				//move the tape right so we must move to prev
				current = current.prev;
				if(current !== null){
					return current.data;
				} else {
					self.prepend('-');
					current=first;
					//we have reached beginning of line
					return current.data;
				}
			} else if (direction === '-'){
				//no movement 
				if (current === null){
					if(first === null)
						self.append('-')
					current = first;
					console.log('traverse reset')
				}
				return current.data;
			} else {
				//the direction is not r, l, or -
				console.log(direction + ' is invalid');
			}
		} else { //there is no current node, so instantiate the current node
			if(first === null)
				self.append('-');
			current = first;
			// console.log('starting traverse');
			return first.data;
		}
	}
	this.peek = function(){
		//peeks at current;
		if(current)
			return current.data;
		else{
			if(first === null)
				self.append('-');
			current = first;
			console.log('starting peek traverse');
			return first.data;
		}
	}

	//attaches a node with data as the first pointer of the LL
	this.prepend = function(data){

		if(first === null){
			//list is empty, so we make this node the first and last node
			first=new tlnode(data);
			last=first;
			first.next=last.next=null;
			first.prev=last.prev=null;
		} else {
			// attach temp node to the first node 
			var temp = new tlnode(data);
			temp.next = first;
			first.prev = temp;
			temp.prev = null;
			// and make new node the first node
			first = temp;
		}
		size++;
		return self;
	}
	this.append=function(data){

		if(first==null){
		//list is empty, so we make this node the first and last node
			first=new tlnode(data);
			last=first;
			first.next=last.next=null;
			first.prev=last.prev=null;
		}
		else{
			//attach temp node to be the last node
			var temp= new tlnode(data);
			last.next=temp;
			temp.prev=last;
			last=temp;
			last.next=null;
		}
		size++;
		return self;
	}
	//finds first instance of this data and removes it
	this.remove = function(data){
		if(size == 0)
			return self;
		else{
			var tempNode = first;
			while(tempNode != null){
				if(tempNode.data == data){
					//then this node is the one we must delete
					if(tempNode.prev != null){
						//there exists a previous node, is not the first node
						tempNode.prev.next=tempNode.next;
						tempNode.next.prev=tempNode.prev;
						size--;
						return self;
					}else{
						first = first.next;
						size--;
						if(first)
							first.prev=null;
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
		var index = 0; 
		var currentIndex = 0, previousIndex = null;
		var trimBeginning = false;
		var trimEnd = true;
		while(tempNode != null){

			if(tempNode.data === '-' && trimBeginning){
				tempNode = tempNode.next;
			}
			else {
				trimBeginning = false;
				arrayLL.push(tempNode.data);
				if(tempNode == current)
					currentIndex = index;
				else if(tempNode == previous)
					previousIndex = index;
				tempNode=tempNode.next;
				index++;
			}
		}

		return {array:arrayLL, currentIndex:currentIndex, previousIndex:previousIndex};
	}
	this.printLL = function(){
		console.log(self.toString());
	}
	this.toString = function (){
		var tempNode=first;
		var stringLL = '';
		while(tempNode != null){
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
	this.equals=function(otherTape){
		//dependent on access to the other current node... might scrap that for array representation

		mArray = self.toArray().array;
		tArray = otherTape.toArray().array;

		if(mArray.length != tArray.length){
			console.log('tapes are different size');
			return false;
		}

		var equalArray = true;
		for (var i =0; i < mArray.length; i++){
			if(equalArray)
				equalArray = (mArray[i] === tArray[i]);
		}
		if (equalArray){
			//now we must traverse and see if current is the same in both.
			var tempMCurr = self.getCurrentNode();
			var tempTCurr = otherTape.getCurrentNode();
			
			if(tempMCurr !== tempTCurr){
				console.log('current node is not the same');
				return false;
			}

			var compare = true;

			while(tempMCurr != null && tempTCurr != null){
				compare = tempMCurr.data === tempTCurr.data;
				//can we do this?
				if(!compare)
					break;
				tempMCurr = tempMCurr.next;
				tempTCurr = tempTCurr.next
			}
			if(!compare)
				console.log("the two lists don't match");
			return compare;
		} else {
			console.log(mArray === tArray)
			return false;
		}
		
	}
	this.cloneTape = function(){
		var clone = new TapeList();
		var toCloneArray = self.toArray();
		clone.init(self.name, toCloneArray.array, toCloneArray.currentIndex);
		if(clone.equals(self)){
			// console.log('clone: '+ clone.toString());
			return clone;
		}	
			
		else
			console.log('clone not equal');
	}

	return self;
}