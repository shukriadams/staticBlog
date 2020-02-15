const path = require('path'),
    urljoin = require('url-join'),
    fs = require('fs-extra'),
    sitemap = require('sitemap');

module.exports = function(context){
    let sitemapUrls = [{ url : 'index.html', changefreq: 'always' /*, priority : '0.1'*/ }];
    
    for (const post of context.posts){
        sitemapUrls.push({
            url : urljoin(context.baseUrl, `${post.url}.html`),
            changefreq : 'monthly'/*,
            priority : '0.5'*/
        });
    }

    let map = sitemap.createSitemap({  
        hostname: context.baseUrl,
        urls: sitemapUrls    
    });

    map.toXML( function(err, xml){ 
        if (err) 
            console.log(xml) 
    });

    fs.writeFileSync(path.join(context.outFolder, 'sitemap.xml'), map.toString());
    
}