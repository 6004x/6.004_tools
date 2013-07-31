Editor.Autocomplete = function(editor, language) {
    var mEditor = editor;
    var mLanguage = language;
    var mTrie = null;
    var mLanguageSettings = null;
    var mSelectionCallback = null;
    var Pos = CodeMirror.Pos;

    var initialise = function() {
        if(!Editor.Completions[language]) {
            console.warn("No autocomplete available for " + language);
            return;
        }
        mLanguageSettings = Editor.Completions[language].Settings;

        mTrie = new RadixTree();
        _.each(Editor.Completions[language].Terms, function(value) {
            var key;
            if(_.isString(value)) {
                key = value.toLowerCase();
            } else if(value.term) {
                key = value.term[0].toLowerCase();
            } else {
                key = value[0].toLowerCase();
            }
            mTrie.insert(key, value);
        });
    };

    var prevent_including_quotes = function(old_selection, expected_text, cm, selection) {
        cm.off('beforeSelectionChange', mSelectionCallback);
        console.log(selection);
        var text = cm.getRange(selection.anchor, selection.head);
        var old_text = cm.getRange(old_selection.from, old_selection.to);
        console.log(old_text, expected_text);
        if(old_text == expected_text) {
            console.log("re-marking at ", old_selection);
            create_mark(cm, old_selection.from, old_selection.to);
        } else if((text[0] == "'" && text[text.length-1] == "'") || (text[0] == '"' && text[text.length-1] == '"')) {
            selection.anchor.ch += 1;
            selection.head.ch -= 1;
        }
    };

    var select_placeholder = function(cm, pos, expected_text) {
        var expected_text = cm.getRange(pos.from, pos.to);
        cm.setSelection(pos.from, pos.to);
        mSelectionCallback = _.partial(prevent_including_quotes, pos, expected_text);
        cm.on('beforeSelectionChange', mSelectionCallback);
    };

    var create_mark = function(cm, from, to) {
        var mark = cm.markText(from, to, {
            className: 'cm-autofilled',
            inclusiveLeft: false,
            inclusiveRight: false,
            atomic: true,
            startStyle: 'cm-autofilled-start',
            endStyle: 'cm-autofilled-end'
        });
        CodeMirror.on(mark, 'beforeCursorEnter', function() {
            var pos = mark.find();
            mark.clear();
            // Hack because we can't modify editor state from in here.
            // 50ms because that seems to let us override cursor input, too.
            console.log('beforeCursorEnter', pos, cm.getRange(pos.from, pos.to));
            setTimeout(function() { select_placeholder(cm, pos); }, 50);
        });
        return mark;
    }

    var expand_completion = function(cm, data, completion) {
        cm.replaceRange(completion.text, data.from, data.to);
        console.log(data);
        var start = data.from.ch + completion.name.length + completion.settings.paramListStart.length;
        console.log(start);
        var orig_start = start;
        var first_pos = null;
        var first_mark = null;
        _.each(completion.params, function(value) {
            console.log(value);
            var p = [
                {line: data.from.line, ch: start},
                {line: data.from.line, ch: start + value.length}
            ];
            console.log(p);
            var mark = create_mark(cm, p[0], p[1]);
            console.log(mark);
            if(first_pos === null) first_pos = p;
            if(first_mark === null) first_mark = mark;
            start += value.length + completion.settings.paramSpacer.length;
        });
        if(first_pos === null) {
            cm.setSelection({ch: orig_start, line: data.from.line});
        } else {
            first_mark.clear();
            select_placeholder(cm, {from: first_pos[0], to: first_pos[1]});
        }
    };

    var render_completion = function(elt, data, completion) {
        var elem = $('<span>');
        elem.append(document.createTextNode(completion.name));
        elem.append($('<span class="muted">')
            .append(completion.settings.paramListStart + completion.params.join(completion.settings.paramSpacer) + completion.settings.paramListEnd));
        elt.appendChild(elem[0]);
    };

    var get_completions = function(token) {
        var results = mTrie.search(token.string.toLowerCase(), 15);
        var completions = [];
        for (var i = results.length - 1; i >= 0; i--) {
            var result = results[i];
            var settings = result.settings ? result.settings : mLanguageSettings;
            if(settings.filter) {
                result = settings.filter(result, token);
                if(result === false) {
                    continue;
                }
            }
            if(result.term) result = result.term;
            if(_.isString(results[i])) {
                completions.push({text: results[i]});
                continue;
            }
            var name = result[0];
            for (var j = result.length - 1; j >= 1; j--) {
                var params = result[j];
                completions.push({
                    text: name + settings.paramListStart + params.join(settings.paramSpacer) + settings.paramListEnd,
                    params: params,
                    name: name,
                    hint: expand_completion,
                    render: render_completion,
                    settings: settings
                });
            };
        };

        return completions;
    };

    this.complete = function(cm) {
        var token = cm.getTokenAt(cm.getCursor());
        var completions = [];
        if(token.string !== '') {
            completions = get_completions(token);
        }
        console.log(token, completions);
        return {
            list: completions,
            from: Pos(cm.getCursor().line, token.start),
            to: Pos(cm.getCursor().line, token.end)
        };
    };

    this.selectPlaceholder = function(cm, pos) {
        select_placeholder(cm, pos);
    };

    initialise();
};
