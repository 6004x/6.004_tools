var ModalDialog = function() {
    var mDialog = null;
    var mTitleHolder = null;
    var mBodyHolder = null;
    var mFooter = null;

    this.setTitle = function(text) {
        mTitleHolder.text(text);
        return this;
    };

    this.setContent = function(content) {
        mBodyHolder.html(content);
        return this;
    };

    this.setText = function(text) {
        mBodyHolder.text(text);
        return this;
    };

    this.addButton = function(label, callback, cls) {
        var button = $('<a href="#" class="btn">').text(label);
        if(callback === 'dismiss') {
            button.attr('data-dismiss', 'modal');
        } else if(_.isFunction(callback)) {
            button.click(function() {
                callback(this);
            });
        } else {
            throw new Error("Button added with illegal callback!");
        }
        if(cls) {
            button.addClass(cls);
        }
        mFooter.append(button);
        return this;
    };

    this.show = function() {
        if(ModalDialog.LastModal) {
            ModalDialog.LastModal.remove();
        }
        ModalDialog.LastModal = mDialog.appendTo('body').modal('show');
        return this;
    };

    this.dismiss = function() {
        mDialog.modal('hide');
        return this;
    };

    var initialise = function() {
        mDialog = $('\
            <div class="modal hide fade">\
                <div class="modal-header">\
                    <button class="close" data-dismiss="modal">&times;</button>\
                    <h3>Title</h3>\
                </div>\
                <div class="modal-body">\
                    <div class="body-holder"></div>\
                </div>\
                <div class="modal-footer">\
                </div>\
            </div>');
        mTitleHolder = mDialog.find('h3');
        mBodyHolder = mDialog.find('.body-holder');
        mFooter = mDialog.find('.modal-footer');
    };
    initialise();
};
ModalDialog.LastModal = null;
