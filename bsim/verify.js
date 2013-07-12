BSim.TextVerifier = function(beta, checksum) {
    var mBeta = beta;
    var mChecksum = checksum;
    var mMessage = null;

    // The checkoffs use the result of this non-standard hash function.
    // It's the Java String.hashCode function.
    var checkoffHashCode = function(str) {
        for(var ret = 0, i = 0, len = str.length; i < len; i++) {
            ret = (31 * ret + str.charCodeAt(i)) << 0;
        }
        return ret + 36038; // Where does 36038 come from? I have no idea.
    };

    this.verify = function() {
        if(!mBeta || mBeta.getCycleCount() === 0) {
            mMessage = 'No simulation results to verify. Did you assemble and run the program?';
            return false;
        }
        var content = mBeta.ttyContent();
        var hash = checkoffHashCode(content);
        console.log(hash,'==',mChecksum);
        if(hash !== mChecksum) {
            mMessage = "The test program did not print out the expected result. Please check the lab writeup to see what result is expected.";
            return false;
        } else {
            mMessage = null;
            return true;
        }
    };

    this.getMessage = function() {
        return mMessage;
    };
};
