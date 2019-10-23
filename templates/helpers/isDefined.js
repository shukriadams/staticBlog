let Handlebars = require('handlebars');

Handlebars.registerHelper('isDefined', function(value, options){
    if (value !== undefined)
        return  options.fn(this);
});