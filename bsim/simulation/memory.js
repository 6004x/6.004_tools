BSim.Beta.Memory = function() {
    var self = this;
    var mMemory = new Uint32Array(0);
    var mMemoryFlags = new Uint8Array(0);
    var mOriginalMemory = new Uint32Array(0);

    var LRU = 0;
    var FIFO = 1;
    var RANDOM = 2;
    var CYCLE = 3;

    // cache parameters
    var cache = false;      // is cache on?
    var lineSize;           // number of words/line (must be 2**N)
    var totalLines;         // total number of lines in the entire cache
    var nWays;              // number of lines/set
    var replacementStrategy;    // how to choose replacement line on miss
    var writeBack;          // use write back instead of write thru?
    var rWay;               // select which subcache will get replacement
    var readCycleCount;     // cycles for main memory read
    var writeCycleCount;    // cycles for main memory write

    var nLines;             // number of lines in each subcache
    var lineShift;          // shift/mask info to retrieve line #
    var lineMask;
    var tagShift;           // shift/mask info to retrieve tag
    var tagMask;
    
    // cache state -- one entry for each cache line
    var dirty;            // dirty bit for each line
    var valid;            // valid bit for each line
    var tag;              // tag for each line
    var age;              // pseudo-time since last use

    // cache statistics
    var cycles;
    var readHits;
    var readMisses;
    var writeHits;
    var writeMisses;
    var dirtyReplacements;
    var validReplacements;
    var totalReplacements; 
    //var random;

    this.loadBytes = function(bytes) {
        var words = Math.ceil(bytes.length / 4);
        mMemory = new Uint32Array(words);
        mOriginalMemory = new Uint32Array(words);
        mMemoryFlags = new Uint8Array(words);
        for(var i = 0; i < bytes.length; i += 4) {
            mMemory[i/4] = (bytes[i+3] << 24) |
                           (bytes[i+2] << 16) |
                           (bytes[i+1] << 8)  |
                            bytes[i+0];
        }
        mOriginalMemory = new Uint32Array(mMemory);
    };

    this.reset = function() {
        mMemory = new Uint32Array(mOriginalMemory);

        // cache statistics
        cycles = 0;
        readMisses = 0;
        writeMisses = 0;
        readHits = 0;
        writeHits = 0;
        dirtyReplacements = 0;
        validReplacements = 0;
        totalReplacements = 0;
        //random.setSeed(0);              // restart pseudorandom sequence
        rWay = 0;                       // reset replacement pointer

        // cache state
        if (cache) {
            for (var i = 0; i < dirty.length; i += 1) {
                dirty[i] = false;
                valid[i] = false;
                tag[i] = 0;
                age[i] = 0;
            }
        }
    };

    this.contents = function() {
        return mMemory;
    };

    // choose replacement line according to current strategy
    function replace(addr,aline,atag,makeDirty) {
        if (nWays > 1) {
            switch (replacementStrategy) {
            case LRU:
            case FIFO:
                {   var oldest = age[aline];
                    var index = aline + nLines;
                    rWay = 0;
                    for (var way = 1; way < nWays; way += 1) {
                        if (age[index] < oldest) {
                            rWay = way;
                            oldest = age[index];
                        }
                        index += nLines;
                    }
                }
                break;
            case RANDOM:
                //todo rWay = random.nextInt(nWays);
                break;
            case CYCLE:
                rWay = (rWay + 1) % nWays;
                break;
            }
        }

        // fill in correct line in chosen subcache
        aline += rWay * nLines;

        // update statistics
        totalReplacements += 1;
        if (valid[aline]) {
            validReplacements += 1;
            // writeback line if dirty
            if (dirty[aline]) {
                dirty[aline] = false;
                dirtyReplacements += 1;
                cycles += writeCycleCount + lineSize - 1;
            }
        }

        // refill line with new data
        valid[aline] = true;
        dirty[aline] = makeDirty;
        tag[aline] = atag;
        cycles += readCycleCount + lineSize - 1;
        age[aline] = cycles;
    }

    this.readWord = function(address) {
        var addr = address >> 2;
        if(addr < 0 || addr >= mMemory.length) {
            throw new BSim.Beta.RuntimeError("Attempted to read out of bounds address 0x" + BSim.Common.FormatWord(address));
        }

        if (cache) {
            cycles += 1;   // cache lookup takes one cycle

            // check the appropriate line of each subcache
            var aline = (address >> lineShift) & lineMask;
            var atag = (address >> tagShift) & tagMask;
            var index = aline;
            for (var way = 0; way < nWays; way += 1) {
                if (valid[index] && tag[index] == atag) {
                    // hit!
                    readHits += 1;
                    if (replacementStrategy == LRU) age[index] = cycles;
                    return mMemory[addr];
                }
                index += nLines;
            }

            // miss -- select replacement and refill
            replace(addr,aline,atag,false);
        } else cycles += readCycleCount;

        readMisses += 1;
        return mMemory[addr];
    };

    this.writeWord = function(address, value) {
        value |= 0; // force to int.
        var addr = address >> 2;
        if (addr < 0 || addr >= mMemory.length) {
            throw new BSim.Beta.RuntimeError("Attempted to write out of bounds address 0x" + BSim.Common.FormatWord(address));
        }
        if (mMemoryFlags[addr]) {
            throw new BSim.Beta.RuntimeError("Attempted write to protected memory at 0x" + BSim.Common.FormatWord(address));
        }

        mMemory[addr] = value;

        if (cache) {
            cycles += 1;   // cache lookup takes one cycle

            // check the appropriate line of each subcache
            var aline = (address >> lineShift) & lineMask;
            var atag = (address >> tagShift) & tagMask;
            var index = aline;
            for (var way = 0; way < nWays; way += 1) {
                if (valid[index] && tag[index] == atag) {
                    // hit!
                    writeHits += 1;
                    if (writeBack) dirty[index] = true;
                    else cycles += writeCycleCount;
                    if (replacementStrategy == LRU) age[index] = cycles;
                    return;
                }
                index += nLines;
            }

            // miss -- select replacement and refill
            replace(addr,aline,atag,writeBack);

            // write-through cache also write word to memory
            if (!writeBack) cycles += writeCycleCount;
        } else {
            cycles += writeCycleCount;
            writeMisses += 1;
        }
    };

    this.size = function() {
        return mMemory.length * 4;
    };

    this.setProtectedRegions = function(regions) {
        _.each(regions, function(region) {
            var start_word = region.start / 4;
            var end_word = region.end / 4;
            for(var i = start_word; i < end_word && i < mMemoryFlags.length; ++i) {
                mMemoryFlags[i] = true;
            }
        });
    };

    this.isProtected = function(address) {
        return !!mMemoryFlags[address >> 2];
    };
};
