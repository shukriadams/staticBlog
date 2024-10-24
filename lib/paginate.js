const path = require('path'),
    stripIndent = require('strip-pre-indent'),
    fs = require('fs-extra')

/**
 * renders a set of html pages against a collection of items. use to create paginated lists for archive pages, 
 * tag pages etc
 * itemsToPaginate : collection of posts or tags to paginate
 */
module.exports = function(context, itemsToPaginate, pageBaseName, pageName, pageSize, model, outFolder){

    let index = 0

    while (true){
        const page = itemsToPaginate.slice(index * pageSize, index * pageSize + pageSize),
            nextPage = itemsToPaginate.slice((index + 1) * pageSize, (index + 1) * pageSize + pageSize);

        // if nothing to render, stop padinating, but always allow first page to render even if no posts
        // have been created yet
        if (!page.length && index > 0)
            break

        model.posts = page
        model.menuItems = context.menuItems

        model.prev = undefined
        if (nextPage.length)
            model.prev = index + 1

        model.next = undefined
        if (index > 0)
            model.next = index - 1

        const rendered = stripIndent(context.templates[pageName](model))
        
        fs.writeFileSync(path.join(outFolder, `${pageBaseName}${index ? `-${index}` : ''}.html`), rendered)

        index ++
    }
}
