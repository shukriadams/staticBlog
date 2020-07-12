let ago = require('s-ago').default,
    Handlebars = require('handlebars')

Handlebars.registerHelper('ago', function(date){
    return ago(date)
})

