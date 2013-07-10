function setup (div) {
    var text = div.text();
    div.empty();
    var area = $("<textarea></textarea>");
    div.append(area);
    area.text(text);
    var button = $("<button class='parse'>Parse</button>");
    div.append(button);
    var output = $("<div class='output'></div>");
    div.append(output);
    button.on("click",go);
    
    function go(){
        var input = area.val();
        try{
            var parsed = Parser.parse(input);
            var stringed = JSON.stringify(parsed, null,"   ").replace(/"/g,"");
            output.text(stringed);
        } catch (err) {
            output.text("Error in line "+err.line+", column "+err.column+
                        ": "+err.message);
        }
    }
}


$(document).ready(function(){
    $('.demo').each(function(){
        setup($(this));
    });
});