const Handlebars = require('handlebars')

Handlebars.registerHelper('shortDate', function(date){
    if (!date)
        return ''

    try {
        return date.toISOString().substr(0, 10)
    } catch(ex){
        return ''
    }
})