BSim.TextVerifier = function(beta, checkoff) {
    var mBeta = beta;
    var mChecksum = checkoff.checksum;
    var mMessage = null;
    var mCheckoff = checkoff;

    // The checkoffs use the result of this non-standard hash function.
    // It's the Java String.hashCode function.
    var checkoffHashCode = function(str) {
        for(var ret = 0, i = 0, len = str.length; i < len; i++) {
            ret = (31 * ret + str.charCodeAt(i)) << 0;
        }
        return ret + 36036; // Where does 36036 come from? I have no idea.
    };

    this.verify = function() {
        if(!mBeta || mBeta.getCycleCount() === 0) {
            mMessage = 'No simulation results to verify. Did you assemble and run the program?';
            return false;
        }
        var content = mBeta.ttyContent();
        var hash = checkoffHashCode(content);

        if(hash !== mChecksum) {
            mMessage = "The test program did not print out the expected result. Please check the lab writeup to see what result is expected. ("+hash+")";
            return false;
        } else {
            mMessage = null;
            return true;
        }
    };

    this.getMessage = function() {
        return mMessage;
    };

    this.checkoff = function() {
        return mCheckoff;
    };
};

BSim.MemoryVerifier = function(beta, checkoff) {
    var mBeta = beta;
    var mCheckoff = checkoff;
    var mAddresses = checkoff.addresses;
    var mValid = (checkoff.checksum === checkoff.running_checksum);
    var mMessage = null;

    this.verify = function() {
        if(!mValid) {
            mMessage = "<strong>Checkoff failed</strong>: invalid checksum";
            return false;
        }
        for(var address in mAddresses) {
            // if(!_.has(mAddresses, address)) continue;
            var value = mAddresses[address];
            if(mBeta.readWord(address) != value) {
                mMessage = "<p><strong>Checkoff failed.</strong></p><table><tr><td>Memory location:</td><td><code>0x" + BSim.Common.FormatWord(parseInt(address,10)) +
                "</code></td></tr><tr><td>Expected value:</td><td><code>0x" + BSim.Common.FormatWord(value) +
                "</code></td></tr><tr><td>Actual value:</td><td><code>0x" + BSim.Common.FormatWord(mBeta.readWord(address)) +
                "</code></td></tr></table>";
                return false;
            }
        }
        mMessage = null;
        return true;
    };

    this.getMessage = function() {
        return mMessage;
    };

    this.checkoff = function() {
        return mCheckoff;
    };
};

BSim.SubmitVerification = function(beta, editor, username, password, collaboration, callback) {
    if(!beta.verifier().verify()) {
        throw new Error("Attempted to submit checkoff without verifiable result.");
    }
    $.post(beta.verifier().checkoff().url, {
        username: username,
        userpassword: password,
        sender: username, // we can't actually figure this one out
        collaboration: collaboration,
        pcheckoff: beta.verifier().checkoff().name,
        checksum: beta.verifier().checkoff().checksum,
        cycles: beta.getCycleCount(),
        size: beta.memorySize(),
        version: 'BSim2.1.0',
        'server info': beta.mServerInfo.join(','),
        /*
        circuits: _.map(editor.filenames(), function(f) {
            return '============== source: ' + f + '\n' + editor.content(f) + '\n==============\n';
        }).join('')
         */
        circuits: _.map(beta.mSources, function (source) {
            // don't send along shared files
            if (source.file.indexOf('/shared') == 0) return '';
            return '============== source: ' + source.file + '\n' + source.content + '\n==============\n';
        }).join('')
    }).done(function(data) {
        callback(true, data);
    }).fail(function() {
        callback(false);
    });
};
