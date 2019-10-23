let Handlebars = require('handlebars');

Handlebars.registerHelper('renderTags', function(tags){
    let output = '';
    
    for (let i = 0 ; i < tags.length ; i ++){
        let url = tags[i].replace(/\s/g, '-');
        output += `<a href=/categories/${url}.html>${tags[i]}</a>`
        if (i < tags.length - 1)
            output += ', ';
    }

    return output;
});