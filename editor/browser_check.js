// Nobody likes browser checks, but since we know what students have...
$(function() {
    var do_check = function(user_agent) {
        var ua = user_agent.match(/(Chrome|Version|Firefox)\/([0-9]+)/);
        if(!ua) {
            return false;
        }
        var browser = ua[1];
        var version = parseInt(ua[2], 10);
        return (
               (browser === "Chrome" && version >= 28)
            || (browser == "Version" && version >= 6) // This is Safari. We might want to set this to 7 for speed.
            || (browser == "Firefox" && version >= 23)
        );
    };

    var show_prompt = function() {
        var modal = $('\
            <div class="modal hide fade">\
                <div class="modal-header">\
                    <button class="close" data-dismiss="modal">&times;</button>\
                    <h3>Unsupported Browser</h3>\
                </div>\
                <div class="modal-body">\
                    <p>You are attempting to use an unsupported web browser.\
                    We recommend using the latest version of Chrome or Chromium, but the latest Firefox or\
                    Safari versions should also work. You should not use Internet Explorer.</p>\
                    <p><strong>On Athena:</strong> press the Windows key and type "chromium".</p>\
                    <p><strong>On a personal machine: <a href="http://google.com/chrome">Get Chrome</p>\
                </div>\
            </div>').modal();
    };

    var do_prompt = function() {
        var is_okay = do_check(navigator.userAgent);
        if(!is_okay) {
            show_prompt();
        }
    }

    do_prompt();
});
