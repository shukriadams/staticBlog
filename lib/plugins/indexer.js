const jsonfile = require('jsonfile'),
    path = require('path'),
    elasticlunr = require('elasticlunr');

module.exports = function(context){
    var index = elasticlunr(function () {
        this.addField('title');
        this.addField('body');
        this.setRef('id');
    });
    
    for (let post of context.posts)
        index.addDoc({
            id : post.url,
            title : post.title,
            body : post.markdown,
            tags : post.tags.join(',')
        });

    jsonfile.writeFileSync(path.join(context.outFolder, '__index.json'), JSON.stringify(index));
}