module("Views");

test("BigTable", function() {
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

