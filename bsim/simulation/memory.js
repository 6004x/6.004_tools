BSim.Beta.Memory = function(mBeta) {
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
    var lineSize = 1;           // number of words/line (must be 2**N)
    var totalLines = 1;         // total number of lines in the entire cache
    var nWays = 1;              // number of lines/set
    var replacementStrategy = LRU;    // how to choose replacement line on miss
    var writeBack = false;          // use write back instead of write thru?
    var rWay;               // select which subcache will get replacement
    var readCycleCount = 10;     // latency for main memory read
    var writeCycleCount = 10;    // latency for main memory write

    var nLines;             // number of lines in each subcache
    var lineShift;          // shift/mask info to retrieve line #
    var lineMask;
    var tagShift;           // shift/mask info to retrieve tag
    var tagMask;
    
    // cache state -- one entry for each cache line
    var dirty = new Uint8Array(0);      // dirty bit for each line
    var valid = new Uint8Array(0);      // valid bit for each line
    var tag = new Uint32Array(0);       // tag for each line
    var age = new Uint32Array(0);       // pseudo-time since last use

    // cache statistics
    var cycles = 0;
    var readHits = 0;
    var readMisses = 0;
    var writeHits = 0;
    var writeMisses = 0;
    var dirtyReplacements = 0;
    var validReplacements = 0;
    var totalReplacements = 0; 
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

    // update DOM with cache statistics
    function update_cache_display() {
        if (cache) {
            var reads = readHits + readMisses;
            var writes = writeHits + writeMisses;
            var total = reads + writes;
            var hits = readHits + writeHits;
            var misses = readMisses + writeMisses;

            $('#read-hits').text(readHits.toString());
            $('#write-hits').text(writeHits.toString());
            $('#total-hits').text(hits.toString());

            $('#read-misses').text(readMisses.toString());
            $('#write-misses').text(writeMisses.toString());
            $('#total-misses').text(misses.toString());

            $('#read-total').text(reads.toString());
            $('#write-total').text(writes.toString());
            $('#total-total').text(total.toString());

            $('#read-pct').text(reads ? (100*readHits/reads).toFixed(1)+'%' : ' ');
            $('#write-pct').text(writes ? (100*writeHits/writes).toFixed(1)+'%' : ' ');
            $('#total-pct').text(total ? (100*hits/total).toFixed(1)+'%' : ' ');
        
            $('#total-cycles').text(cycles.toString());
        } else {
            $('.cache-span').text(' ');
        }
    }

    function cache_reset() {
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
        for (var i = 0; i < dirty.length; i += 1) {
            dirty[i] = 0;
            valid[i] = 0;
            tag[i] = 0;
            age[i] = 0;
        }

        update_cache_display();
    };

    this.reset = function() {
        mMemory = new Uint32Array(mOriginalMemory);
        cache_reset();
    };
    
    this.contents = function() {
        return mMemory;
    };

    function log2(n) {
        var log = 0;
        var v = 1;

        while (log < 32) {
            if (v >= n) break;
            v <<= 1;
            log += 1;
        }
        return log;
    }
            
    function mask(n) {
        var log = log2(n);
        if (log == 32) return 0xFFFFFFFF;
        else return (1 << log) - 1;
    }

    function process_cache_parameters() {
        if (cache) {
            dirty = new Uint8Array(totalLines);  // boolean
            valid = new Uint8Array(totalLines);  // boolean
            tag = new Uint32Array(totalLines);
            age = new Uint32Array(totalLines);

            nLines = totalLines / nWays;
            lineShift = log2(lineSize)+2;
            lineMask = mask(nLines);
            tagShift = lineShift + log2(nLines);
            tagMask = (1 << (32 - tagShift)) - 1;

            var ntagbits = 32 - tagShift;
            var nbits = 32*lineSize + ntagbits + 1 + (writeBack ? 1 : 0);
            var cost_sram = (nLines == 1) ? totalLines*nbits*50 :   // registers
                            totalLines*nbits*6 +        // ram bits
                            (tagShift - lineShift)*20 + // address buffers
                            nLines*20 +                 // address decode for each row
                            nbits*nWays*30;             // sense amp + output drivers
            var ncomparators = nWays*(32 - tagShift);
            var cost_comparators = ncomparators * 20;
            var nmuxes = nWays*32*(lineSize - 1);       // tree of 2:1 32-bit muxes
            var cost_muxes = nmuxes * 8;

            // update display
            var txt = 'tag=[31:'+tagShift.toString()+']';
            if (nLines > 1) txt += ', index=['+(tagShift-1).toString()+':'+lineShift.toString()+']';
            else txt += ', index=N/A';
            txt += ', offset=['+(lineShift-1).toString()+':0]';
            $('#address-bits').text(txt);
            txt = nLines.toString()+'x'+(nWays*nbits).toString();
            $('#mem-size').text(txt);
            txt = ncomparators.toString();
            $('#comparator-bits').text(txt);
            txt = nmuxes.toString();
            $('#mux-bits').text(txt);
            txt = cost_sram + cost_comparators + cost_muxes;
            $('#total-cost').text(txt);

            $('#line-size').prop('disabled',false);
            $('#total-lines').prop('disabled',false);
            $('#associativity').prop('disabled',false);
            $('#replacement-strategy').prop('disabled',nWays == 1);
            $('#write-strategy').prop('disabled',false);
        } else {
            $('#line-size').prop('disabled',true);
            $('#total-lines').prop('disabled',true);
            $('#associativity').prop('disabled',true);
            $('#replacement-strategy').prop('disabled',true);
            $('#write-strategy').prop('disabled',true);
        }

        cache_reset();
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
                dirty[aline] = 0;
                dirtyReplacements += 1;
                cycles += writeCycleCount + lineSize - 1;
            }
        }

        // refill line with new data
        valid[aline] = 1;
        dirty[aline] = makeDirty ? 1 : 0;
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
                    if (writeBack) dirty[index] = 1;
                    else cycles += writeCycleCount;
                    if (replacementStrategy == LRU) age[index] = cycles;
                    return;
                }
                index += nLines;
            }

            // miss -- select replacement and refill
            writeMisses += 1;  // ???
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

    // set up change event handlers for cache controls
    $('#cache-status').on('change',function (e) {
        cache = $(this).val() == 'on';
        process_cache_parameters();
    });
    $('#line-size').on('change',function (e) {
        lineSize = parseInt($(this).val());
        process_cache_parameters();
    });
    $('#total-lines').on('change',function (e) {
        totalLines = parseInt($(this).val());
        if ($('#associativity').val() == 'fully associative')
            nWays = totalLines;
        process_cache_parameters();
    });
    $('#associativity').on('change',function (e) {
        switch ($(this).val()) {
        case 'direct mapped': nWays = 1; break;
        case '2-way': nWays = 2 ; break;
        case '4-way': nWays = 4 ; break;
        case '8-way': nWays = 8; break;
        case 'fully associative': nWays = totalLines; break;
        }
        process_cache_parameters();
    });
    $('#replacement-strategy').on('change',function (e) {
        switch ($(this).val()) {
        case 'LRU': replacementStrategy = LRU; break;
        case 'FIFO': replacementStrategy = FIFO; break;
        case 'Random': replacementStrategy = RANDOM; break;
        case 'Cycle': replacementStrategy = Cycle; break;
        }
        process_cache_parameters();
    });
    $('#write-strategy').on('change',function (e) {
        switch ($(this).val()) {
        case 'write-through': writeBack = false; break;
        case 'write-back': writeBack = true; break;
        }
    });

    process_cache_parameters();  // initially use default values

    mBeta.on('read:register', update_cache_display);  // update cache stats 
};
