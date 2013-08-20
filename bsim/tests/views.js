module("Views");

test("BigTable", function() {
    expect(20);
    var fixture = $('#qunit-fixture');
    var container = $('<div>').appendTo(fixture);
    var table = new BigTable(container, 300, 180, 20, 3);
    var html = container.find('tbody');
    var scroller = container.children('div');

    equal(html.children('tr').length, 9, "180 pixel high table has nine display rows.");

    table.updateRow(0, ['foo']);
    ok(true, 'Updating nonexistent row fails silently.');

    table.updateCell(1, 1, 'bar');
    ok(true, 'Updating nonexistent cell fails silently.');

    equal(table.rowCount(), 0, "Empty table has zero rows.");

    // Insert some data
    for(var i = 0; i < 20; ++i) {
        table.insertRow(['hello' + i, 'world' + i, 'test data ' + i]);
    }

    equal(table.rowCount(), 20, "Table now has twenty rows.");

    equal(html.find('tr:first > td:first').text(), 'hello0', "Top row of visual table is top of backing table.");

    table.addRowClass(0, 'test-class');
    ok(html.find('tr:first').hasClass('test-class'), 'Test class was immediately added to visible row.');

    table.addRowClass(19, 'end-class');
    ok(!html.find('tr:last').hasClass('end-class'), 'Class at end of backing table was not added to invisible row.');

    table.scrollTo(19);
    stop();
    _.defer(function() {
        equal(html.find('tr:last > td:first').text(), 'hello19', "Bottom row of visual table is bottom of backing table after scroll.");
        ok(html.find('tr:last').hasClass('end-class'), 'Class at end of backing table was added to now-visible row.');
        ok(!html.find('tr:first').hasClass('test-class'), 'Class at top of backing table was removed from now-invisible row.');
        equal(scroller[0].scrollTop, 220, "Scroller moved to bottom.");

        table.startBatch();
        table.addRowClass(11, 'batched-class');
        table.addRowClass(11, 'second-class');
        ok(!html.find('tr:first').hasClass('batched-class'), "Class not added in batch mode.");
        table.endBatch();
        ok(html.find('tr:first').hasClass('batched-class'), "Class added on batch end.");
        ok(html.find('tr:first').hasClass('second-class'), "Multiple classes added.");
        table.removeRowClass(11, 'batched-class');
        ok(html.find('tr:first').hasClass('second-class') && !html.find('tr:first').hasClass('batched-class'), "Class removal correctly removes only specified class.")


        scroller[0].scrollTop = 0;
        _.defer(function() {
            equal(html.find('tr:first > td:first').text(), 'hello0', "Scroller moved back to top of table.");

            table.empty();
            equal(table.rowCount(), 0, "Empty table has zero rows.");
            equal(html.find('tr:first > td:first').text(), '', 'Empty table is blank.');
            ok(!html.find('tr:first').hasClass('test-class'), 'Empty removed classes.');

            start();
        });
    });
});

test("Register File", function() {
    var fixture = $('#qunit-fixture');
    var container = $('<div>').appendTo(fixture);
    var beta = new FakeBeta();
    _.extend(beta, Backbone.Events);

    var regfile = new BSim.RegfileView(container, beta);

    var html = container.find('table');
    equal(html.find('td.value').length, 32, "Appropriate number of registers displayed.");

    beta.trigger('change:register', 2, 0xDEADBEEF);
    equal(html.find('tr:nth-child(3) > td.value:first').text(), "deadbeef", "Single-register update works.");
    beta.trigger('change:register', 0, true);
    equal(html.find('tr:first > td.value:first').text(), "00000001", "Booleans become integers.");

    beta.trigger('change:bulk:register', {0: 42, 31: 24});
    equal(html.find('tr:first > td.value:first').text(), "0000002a", "Bulk change works (1)");
    equal(html.find('tr:last > td.value:last').text(), "00000018", "Bulk change works (2)");
});

test("TTY", function() {
    expect(11);

    var beta = new FakeBeta();
    _.extend(beta, Backbone.Events);

    var container = $('<div>').appendTo('#qunit-fixture');

    var tty = new BSim.TTY(container, beta);
    var html = container.find('.tty-output');

    // Mouse tests
    // ----------------
    var offset = container.offset();
    var mouse = new $.Event('click', {pageX:100 + offset.left, pageY:200 + offset.top});
    container.find('pre').trigger($.Event('focus'));
    stop();
    setTimeout(function() {
        beta.mouseInterrupt = function(x, y) {
            deepEqual([x, y], [100, 200], "Positive mouse coordinates reported correctly.");
        };
        container.find('pre').trigger(mouse);
        mouse.pageX = offset.left;
        mouse.pageY = offset.top;
        beta.mouseInterrupt = function(x, y) {
            deepEqual([x, y], [0, 0], "Zero mouse coordinates reported correctly.");
        };
        container.find('pre').trigger(mouse);
        mouse.pageX = offset.left - 10;
        mouse.pageY = offset.top - 10;
        beta.mouseInterrupt = function(x, y) {
            deepEqual([x, y], [0, 0], "Negative mouse coordinates reported correctly.");
        };
        container.find('pre').trigger(mouse);


        // Keyboard tests
        // -----------------
        var keyboard = new $.Event('keypress', {which: 97});
        beta.keyboardInterrupt = function(key) {
            equal(key, 97, "Keyboard interrupts triggered correctly.");
        };
        container.trigger(keyboard);

        // Text output tests
        // -----------------

        beta.trigger('text:out', 'hello');
        equal(html.text(), "hello", "Initial text output works.");
        beta.trigger('text:out', ' world');

        // Due to throttling, this should still only contain 'hello'. Probably.
        equal(html.text(), "hello", "Text output is throttled.");

        setTimeout(function() {
            equal(html.text(), "hello world", "Text output completes after delay.");

            beta.trigger('text:out', '');
            beta.trigger('text:out', ' world');
            beta.trigger('text:replace', "goodbye");
            equal(html.text(), "goodbye", "replace works");
            setTimeout(function() {
                equal(html.text(), "goodbye", "replace clears pending text appends.");

                beta.trigger('text:out', '');
                beta.trigger('text:out', 'foo');
                beta.trigger('text:clear');
                equal(html.text(), "", "clear clears text.");
                setTimeout(function() {
                    equal(html.text(), "", "clear clears pending text appends.");

                    start();
                }, 55);
            }, 55);
        }, 55);

    }, 110);
});
