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
        var holder = $('<div>').appendTo(mInputHolder);
        if(settings.label) {
            mInputHolder.addClass('form-horizontal');
            holder.addClass('control-group');
        }
        var input = $('<input type="text">').appendTo(holder);
        if(settings.label) {
            $('<label>').addClass('control-label').text(settings.label).appendTo(holder);
            var control_wrapper = $('<div>').addClass('controls').appendTo(holder).append(input);
        }
        if(settings.placeholder) {
            input.attr('placeholder', settings.placeholder);
        }
        if(settings.type) {
            input.attr('type', settings.type);
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

    this.inputContent = function(index) {
        if(!index) index = 0;
        if(mInputHolder.find('input').eq(index)) {
            return mInputHolder.find('input').eq(index).val();
        } else {
            return null;
        }
    };

    this.clearInput = function() {
        mInputHolder.clear();
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

    this.setWidth = function(width) {
        mDialog.css('width',width);
    };

    this.noFocus = function() {
        mDialog.off('shown');
    };

    this.find = function(selector) {
        return mDialog.find(selector);
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
                    <form class="modal-input">\
                    </form>\
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
            mInputHolder.find('input').first().focus();
        });
    };
    initialise();
};
ModalDialog.LastModal = null;
