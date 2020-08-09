const ago = require('s-ago').default,
    Handlebars = require('handlebars')

Handlebars.registerHelper('ago', function(date){
    if (!date)
        return ''

    try {
        return ago(date)
    } catch(ex){
        return ''
    }
})

