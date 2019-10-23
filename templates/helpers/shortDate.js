let Handlebars = require('handlebars');

Handlebars.registerHelper('shortDate', function(date){
    return date.toISOString().substr(0, 10)
});