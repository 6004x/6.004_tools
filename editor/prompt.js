var ModalDialog = function() {
    var self = this;
    var mDialog = null;
    var mTitleHolder = null;
    var mBodyHolder = null;
    var mInputHolder = null;
    var mErrorHolder = null;
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
        var p = $('<p>').text(text);
        mBodyHolder.empty().append(p);
        return this;
    };

    this.addButton = function(label, callback, cls) {
        var button = $('<a href="#" class="btn">').text(label);
        if(callback === 'dismiss') {
            button.attr('data-dismiss', 'modal');
        } else if(_.isFunction(callback)) {
            button.click(function() {
                callback(self);
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

    this.inputBox = function(settings) {
        mInputHolder.empty();
        var holder = $('<div>').appendTo(mInputHolder);
        var input = $('<input type="text">').appendTo(holder);
        if(settings.placeholder) {
            input.attr('placeholder', settings.placeholder);
        }
        if(settings.prefix) {
            holder.addClass('input-prepend');
            $('<span class="add-on">').text(settings.prefix).prependTo(holder);
        }
        if(settings.suffix) {
            holder.addClass('input-append');
            $('<span class="add-on">').text(settings.suffix).appendTo(holder);
        }
        if(settings.callback) {
            input.keypress(function(e) {
                var key = e.which || e.keyCode;
                if (key == 13) { // 13 is enter
                    settings.callback(self);
                    e.preventDefault();
                }
            });
        }
        if(settings.typeahead) {
            var typeahead = settings.typeahead;
            if(_.isFunction(typeahead)) {
                typeahead = {source: typeahead};
            } else if (_.isArray(typeahead)) {
                typeahead = {source: typeahead};
            }
            // Hack: we want the typeahead to drop down below the container, but the container instead
            // gains a scrollbar. If we have a typeahead, override the scroll behaviour.
            mDialog.find('.modal-body').css('overflow-y', 'visible');
            input.typeahead(typeahead);
        }
    };

    this.inputContent = function() {
        if(mInputHolder.find('input')) {
            return mInputHolder.find('input').val();
        } else {
            return null;
        }
    };

    this.showError = function(message, is_html, cls) {
        if(!cls) cls = 'alert-error';
        mErrorHolder.empty();
        var div = $('<div class="alert">').addClass(cls);
        if(is_html) {
            div.html(message);
        } else {
            div.text(message);
        }
        div.appendTo(mErrorHolder);
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
                    <div class="modal-error">\
                    </div>\
                    <div class="body-holder"></div>\
                    <div class="modal-input">\
                    </div>\
                </div>\
                <div class="modal-footer">\
                </div>\
            </div>');
        mTitleHolder = mDialog.find('h3');
        mBodyHolder = mDialog.find('.body-holder');
        mInputHolder = mDialog.find('.modal-input');
        mFooter = mDialog.find('.modal-footer');
        mErrorHolder = mDialog.find('.modal-error');

        mDialog.on('shown', function() {
            mInputHolder.find('input').focus();
        });
    };
    initialise();
};
ModalDialog.LastModal = null;
