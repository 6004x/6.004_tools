Editor.Autocomplete = function(editor, language) {
    var mEditor = editor;
    var mLanguage = language;
    var mTrie = null;
    var mLanguageSettings = null;
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
            } else {
                key = value[0].toLowerCase();
            }
            mTrie.insert(key, value);
        });
    };

    var prevent_including_quotes = function(cm, selection) {
        var text = cm.getRange(selection.anchor, selection.head);
        if((text[0] == "'" && text[text.length-1] == "'") || (text[0] == '"' && text[text.length-1] == '"')) {
            selection.anchor.ch += 1;
            selection.head.ch -= 1;
        }
        cm.off('beforeSelectionChange', prevent_including_quotes);
    };

    var select_placeholder = function(cm, pos) {
        cm.setSelection(pos.from, pos.to);
        cm.on('beforeSelectionChange', prevent_including_quotes);
    };

    var expand_completion = function(cm, data, completion) {
        cm.replaceRange(completion.text, data.from, data.to);
        console.log(data);
        var start = data.from.ch + completion.name.length + mLanguageSettings.paramListStart.length;
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
            var mark = cm.markText(p[0], p[1], {
                className: 'cm-autofilled',
                inclusiveLeft: false,
                inclusiveRight: false,
                atomic: true,
                startStyle: 'cm-autofilled-start',
                endStyle: 'cm-autofilled-end'
            });
            console.log(mark);
            if(first_pos === null) first_pos = p;
            if(first_mark === null) first_mark = mark;
            CodeMirror.on(mark, 'beforeCursorEnter', function() {
                var pos = mark.find();
                mark.clear();
                // Hack because we can't modify editor state from in here.
                // 50ms because that seems to let us override cursor input, too.
                setTimeout(function() { selectPlaceholder(cm, pos); }, 50);
            });
            start += value.length + mLanguageSettings.paramSpacer.length;
        });
        if(first_pos === null) {
            cm.setSelection({ch: orig_start, line: data.from.line});
        } else {
            first_mark.clear();
            cm.setSelection(first_pos[0], first_pos[1]);
        }
    };

    var render_completion = function(elt, data, completion) {
        var elem = $('<span>');
        elem.append(document.createTextNode(completion.name));
        elem.append($('<span class="muted">')
            .append(mLanguageSettings.paramListStart + completion.params.join(mLanguageSettings.paramSpacer) + mLanguageSettings.paramListEnd));
        elt.appendChild(elem[0]);
    };

    var get_completions = function(token) {
        var results = mTrie.search(token.string.toLowerCase(), 15);
        var completions = [];
        for (var i = results.length - 1; i >= 0; i--) {
            var result = results[i];
            if(mLanguageSettings.filter) {
                result = mLanguageSettings.filter(result, token);
                if(result === false) {
                    continue;
                }
            } 
            if(_.isString(results[i])) {
                completions.push({text: results[i]});
                continue;
            }
            var name = result[0];
            for (var j = result.length - 1; j >= 1; j--) {
                var params = result[j];
                completions.push({
                    text: name + mLanguageSettings.paramListStart + params.join(mLanguageSettings.paramSpacer) + mLanguageSettings.paramListEnd,
                    params: params,
                    name: name,
                    hint: expand_completion,
                    render: render_completion
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
