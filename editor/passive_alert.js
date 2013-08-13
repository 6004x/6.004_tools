var PassiveAlert = function(text, alert_type) {
    var holder = $('#header-alert-holder');

    var alert = $('<div>').addClass('alert fade in').text(text);
    if(alert_type) {
        alert.addClass('alert-' + alert_type);
    }
    alert.append('<a class="close" data-dismiss="alert" href="#">&times;</a>');
    holder.empty().append(alert);
    alert.alert();
    setTimeout(function() {
        alert.alert('close');
    }, 10000);
};
