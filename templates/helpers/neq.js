let Handlebars = require('handlebars');

Handlebars.registerHelper('neq', function(value1, value2, options){
    if (value1 !== value2)
        return options.fn(this);
});