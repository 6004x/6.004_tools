var Toolbar = function(container) {
    var mContainer = $(container);
    var mToolbarHolder = $('<div class="btn-toolbar">');

    this.addButtonGroup = function(buttons) {
        var group = $('<div class="btn-group">');
        _.each(buttons, function(button) {
            button.render(group);
        });
        mToolbarHolder.append(group);
        return group;
    };

    var initialise = function() {
        mContainer.append(mToolbarHolder);
    };
    initialise();
};

var ToolbarButton = function(icon, callback, tooltip, cls) {
    var self = this;
    var mTooltip = tooltip;
    var mIcon = icon;
    var mCallback = callback;
    var mElement = null;

    self.render = function(container) {
        if(mElement) {
            mElement.remove();
            mElement.data('button', null);
            mElement = null;
        }
        // Special case: if 'icon' is a string starting with 'icon-', assume they wanted a Bootstrap icon.
        // Otherwise it's whatever jQuery makes of it.
        mElement = $('<button class="btn">');
        if(cls) {
            mElement.addClass(cls);
        }
        self.setLabel(mIcon);
        if(mTooltip) {
            mElement.tooltip({title: mTooltip, placement: 'top', delay: 100, container: 'body'});
        }
        if(mCallback) {
            mElement.click(function () {
                mElement.tooltip('hide');
                mCallback();
            });
        }
        mElement.data('button', self);
        container.append(mElement);
    };

    self.disable = function() {
        mElement.attr('disabled', 'disabled');
        mElement.tooltip('hide');
    };

    self.enable = function() {
        mElement.removeAttr('disabled');
    };

    self.setLabel = function(label) {
        mIcon = label;
        if(/^icon-/.test(label)) {
            label = $('<i>').addClass(label);
        }
        mElement.empty().append(label);
    };

    // You shouldn't use this.
    self.setID = function(id) {
        mElement.attr('id', id);
    };
};
