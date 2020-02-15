const path = require('path'),
    fs = require('fs-extra');

/**
 * renders a set of html pages against a collection of items. use to create paginated lists for archive pages, 
 * tag pages etc
 * itemsToPaginate : collection of posts or tags to paginate
 */
module.exports = function(context, itemsToPaginate, pageBaseName, pageName, pageSize, model, outFolder){

    let index = 0;

    while (true){
        const page = itemsToPaginate.slice(index * pageSize, index * pageSize + pageSize),
            nextPage = itemsToPaginate.slice((index + 1) * pageSize, (index + 1) * pageSize + pageSize);

        if (!page.length)
            break;

        model.posts = page;
        model.blogName = context.blogName;
        model.menuItems = context.menuItems;

        model.prev = undefined;
        if (index > 0)
            model.prev = index - 1;

        model.next = undefined;
        if (nextPage.length)
            model.next = index + 1;

        const rendered = context.templates[pageName](model);
        
        fs.writeFileSync(path.join(outFolder, `${pageBaseName}${index ? `-${index}` : ''}.html`), rendered);

        index ++;
    }
}