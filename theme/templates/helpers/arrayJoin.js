const Handlebars = require('handlebars')

Handlebars.registerHelper('arrayJoin', function(tags){
    let output = ''
    
    for (let i = 0 ; i < tags.length ; i ++){
        output += `${tags[i]}`
        if (i < tags.length - 1)
            output += ', '
    }

    return output
})