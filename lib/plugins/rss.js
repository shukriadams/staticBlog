// writes an rss.xml file of all available posts 
const RSS = require('rss'),
    path = require('path'),
    urljoin = require('url-join'),
    fs = require('fs-extra');

module.exports= function(context){

    const feed = new RSS({
        title: context.blogName,
        description: context.blogDescription,
        feed_url: urljoin(context.baseUrl, `rss.xml`),
        site_url: context.baseUrl,
        copyright: new Date().getFullYear()
    });

    for (const post of context.posts)
        feed.item({
            title: post.title,
            description: post.description,
            url: urljoin(context.baseUrl, `${post.url}`),
            categories: post.tags,
            date: post.date
        });

    fs.writeFileSync(path.join(context.outFolder, 'rss.xml'), feed.xml());
}
