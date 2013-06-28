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
        var parsed = parser.tokenize(input);
        var stringed = JSON.stringify(parsed);
        var done = stringed.replace(/},{/g,"},\n{");
        output.text(done);
    }
}


$(document).ready(function(){
    $('.demo').each(function(){
        setup($(this));
    });
});