// Provides a scrollable table view that doesn't try to render the entire data set in the DOM.
// container: DOM element to insert the table in
// width: table width in pixels
// height: table height in pixels
// row_height: height of each row in pixels
// column_count: number of columns in pixels.
// Note that height must be an exact multiple of row_height, and will be adjusted to the closest
// value if it isn't.
//
// The basic idea is that it creates a minimal table to fill the width, and overlays an element
// that has the height of the whole table. As that element scrolls, the table's contents are adjusted
// to match the expected content of the viewport
var BigTable = function(container, width, height, row_height, column_count) {
    var mContainer = $(container);
    var mRowHeight = row_height;
    var mDisplayRowCount = Math.floor(height / row_height);
    var mWidth = width;
    var mHeight = mDisplayRowCount * mRowHeight;
    var mColumnCount = column_count;
    var mEmptyData = [];

    var mVisibleStart = 0;
    var mData = [];
    var mTableRows = [];

    var mScroller = null;
    var mScrollContent = null;
    var mContent = null;

    var mBufferingDraws = 0;

    // Inserts a row of data at the end
    // data: array of cells for the row. Must have length equal to the table's column count.
    this.insertRow = function(data) {
        data.cls = '';
        mData.push(data);
        mScrollContent.css({height: mRowHeight * mData.length})
        redraw(mData.length - 1);
    };

    // Updates the given row with the given data. The row must exist.
    // data's length must be equal to the table's column count.
    this.updateRow = function(row, data) {
        if(!mData[row]) {
            return;
        }
        mData[row] = data;
        redraw(row);
    };

    // Update's the given column of the given row with the given data, which should be a string.
    this.updateCell = function(row, column, data) {
        if(!mData[row]) {
            return;
        }
        mData[row][column] = data;
        redraw(row);
    };

    // Empties and blanks the table
    this.empty = function() {
        mData = [];
        mVisibleStart = 0;
        redraw();
    };

    // Adds a class the given row. If the optional parameter redraw is true, redraws the row immediately.
    this.addRowClass = function(row, cls) {
        if(!mData[row]) return;
        if(!~mData[row].cls.indexOf(' ' + cls + ' ')) {
            mData[row].cls += ' ' + cls + ' ';
            redraw(row);
        }
    };

    // Removes a class from the given row. If the optional parameter redraw is true, redraws the row immediately.
    this.removeRowClass = function(row, cls) {
        if(!mData[row]) return;
        mData[row].cls = mData[row].cls.replace(' ' + cls + ' ', '');
        redraw(row);
    };

    // Attempts to centre the given row in the display.
    this.scrollTo = function(row, where) {
        if(!where) where = 'middle';
        var height = (row * mRowHeight);
        if(where == 'middle') height -= (mHeight / 2) - (mRowHeight);
        else if(where == 'bottom') height -= mHeight - mRowHeight;
        mScroller[0].scrollTop = height;
        handleScroll(height); // Manually do this to make sure we are locked on where we intend to be.
    };

    // Returns the number of (logical) rows in the table.
    this.rowCount = function() {
        return mData.length;
    };

    this.startBatch = function() {
        mBufferingDraws++;
    };

    this.endBatch = function() {
        mBufferingDraws--;
        if(!mBufferingDraws)
            redraw();
    };

    this.resize = function(height) {
        mDisplayRowCount = Math.floor(height / mRowHeight);
        mHeight = mDisplayRowCount * mRowHeight;
        mContent.css({height: mHeight});
        mScroller.css({height: mHeight});
        create_rows();
        redraw();
    };

    var create_rows = function() {
        // Set up our display rows.
        mContent.empty();
        mTableRows = [];
        for(var i = 0; i < mDisplayRowCount; ++i) {
            var row = $('<tr>').css({height: mRowHeight});
            var row_cells = [];
            for(var j = 0; j < mColumnCount; ++j) {
                var cell = $('<td>');
                row.append(cell);
                row_cells.push(cell[0]);
            }
            row_cells.row = row[0];
            mTableRows.push(row_cells);
            mContent.append(row);
        }
    }

    var redraw = function(row) {
        if(mBufferingDraws) return;
        // If we weren't given an argument, redraw everything visible.
        if(row === undefined) {
            for(var i = mVisibleStart; i < mVisibleStart + mDisplayRowCount; ++i) {
                redraw(i);
            }
            return;
        } else {
            if(row >= mVisibleStart && row < mVisibleStart + mDisplayRowCount) {
                var display_row = row - mVisibleStart;
                var data = mData[row] || mEmptyData;
                for (var j = data.length - 1; j >= 0; j--) {
                    mTableRows[display_row][j].textContent = data[j];
                }
                mTableRows[display_row].row.className = data.cls;
            }
            return;
        }
    };

    var handleScroll = function(height) {
        var top = (_.isNumber(height)) ? height : mScroller[0].scrollTop;
        if(top < 0) top = 0; // This can probably actually happen.
        var top_row = (top / mRowHeight)|0;
        // Don't do anything if we haven't actually moved.
        if(top_row != mVisibleStart) {
            mVisibleStart = top_row;
            redraw();
        }
    };

    var initialise = function() {
        mScroller = $('<div>').css({width: mWidth, height: mHeight, position: 'absolute', top: 0, left: 0, 'overflow-y': 'scroll'});
        mContent = $('<table>').css({width: mWidth, height: mHeight, position: 'absolute', top: 0, left: 0});
        mScrollContent = $('<div>');

        mContainer.css({position: 'relative'}).append(mContent, mScroller);
        mScroller.append(mScrollContent);
        mScroller.scroll(handleScroll);

        // Set up our handy mEmptyData
        for(var k = 0; k < mColumnCount; ++k) {
            mEmptyData.push('');
        }
        mEmptyData.cls = '';

        create_rows();
    };

    initialise();
};
