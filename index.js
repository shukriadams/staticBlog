// load .env file first, this will be used to define consts below
require('custom-env').env();

const 
    glob = require('glob'),
    path = require('path'),
    RSS = require('rss'),
    fs = require('fs-extra'),
    urljoin = require('url-join'),
    process = require('process'),
    showdown  = require('showdown'),
    Handlebars = require('handlebars'),
    layouts = require('handlebars-layouts'),
    sitemap = require('sitemap'),
    converter = new showdown.Converter(),
    pages = {},
    posts = {},
    pageSize = parseInt(process.env.pageSize ? process.env.pageSize : '3'),
    archivePageSize = parseInt(process.env.archivePageSize ? process.env.archivePageSize : '3'),
    blogName = process.env.blogName ? process.env.blogName.trim() : 'Your blog name here', 
    blogDescription = process.env.blogDescription ? process.env.blogDescription.trim() : 'Your blog description here', 
    outFolder = './web',
    baseurl = process.env.baseurl ? process.env.baseurl.trim() : 'https://example.com',
    // categories and archives are placed in their own folders to avoid collision with posts
    tagsFolder = path.join(outFolder, 'categories'),
    archiveFolder = path.join(outFolder, 'archive');

fs.ensureDirSync(outFolder);
fs.ensureDirSync(tagsFolder);
fs.ensureDirSync(archiveFolder);

Handlebars.registerHelper(layouts(Handlebars));

// clean up rendered files
const htmlFiles = glob.sync(path.join(outFolder, '**/*.html'));
for (let file of htmlFiles)
    fs.unlinkSync(file);

// partial templates
const partialPaths = glob.sync('./templates/partials/**/*.hbs'); 
for (let partialPath of partialPaths){
    let content = fs.readFileSync(partialPath, 'utf8'),
        name = path.basename(partialPath).match(/(.*).hbs/).pop(); 

    Handlebars.registerPartial(name, content);
}

// page templates
const pagePaths = glob.sync('./templates/pages/**/*.hbs'); 
for (let pagePath of pagePaths){
    let content = fs.readFileSync(pagePath, 'utf8'),
        name = path.basename(pagePath).match(/(.*).hbs/).pop(); 

    pages[name] = Handlebars.compile(content);
}

// helpers
const helperPaths = glob.sync('./templates/helpers/**/*.js'); 
for (let helperPath of helperPaths){
    require(helperPath);
}


/**
 * markdown models
 * reserved fields for model :
 * - title
 * - date : must be a parsable Javascript date
 * - markdown : the markdown content of the page
 */ 
const markdownPaths = glob.sync('./posts/**/*.md'); 
for (const markdownPath of markdownPaths){
    let post = {},
        content = fs.readFileSync(markdownPath, 'utf8'),
        name = path.basename(markdownPath).match(/(.*).md/).pop();

    let lines = content.split('\n');

    // find the position of the dividing line between post data and markup
    let dividerLineCount = null;
    for (let i = 0 ; i < lines.length; i ++){
        if (lines[i].match(/^-+/)){
            dividerLineCount = i;
            break;
        }
    }

    if (!dividerLineCount){
        console.log(`WARNING : post ${name} does not contain a valid data header, it won't be published.`);
        continue;
    }

    // read each line from data header into post model
    let lineIndex = 0;
    while (lineIndex < dividerLineCount){
        let groups = lines[lineIndex].match(/(.*):(.*)/);
        
        if (groups.length !== 3){
            console.error(`WARNING : ${lines[lineIndex]} in post ${name} is not properly formatted, NAME:VALUE is expected.`);
            continue;
        }
        
        post[groups[1].trim()] = groups[2].trim();
        lineIndex++;          
    }

    if (!post.title){
        console.error(`WARNING : post "${name}" has an empty title, it won't be published.`);
        continue;
    }

    // tags are optional, if none are defined, create empty list. tags must be entered as comma-separated
    // list, but are converted to array
    post.tags = post.tags || '';
    post.tags = post.tags.split(',').filter((tag)=>{ return tag.length > 0;});
    post.tags = post.tags.map((tag)=>{return tag.trim()});

    post.date = new Date(post.date);
    if (isNaN(post.date)){
        console.error(`WARNING : post ${name} has an invalid or missing date, it won't be published.`);
        continue;
    }

    // post url is locked to the filename of its markdown file
    post.url = `${name}`;

    // convert markdown to markup
    post.markdown = lines.slice(dividerLineCount + 1).join('\n');
    post.markdown = converter.makeHtml(post.markdown);
    post.keywords = post.tags.join(',');
    posts[name] = post;
}

if (posts.index){
    console.error('WARNING - you have a post called "index", this name is reserved and will always be overwritten');
}
    

let menuItems = [],
    allPosts = [];

for (const prop in posts){
    let post = posts[prop];
    post.filename = prop;
    allPosts.push(post);

    if (post.menu)
        menuItems.push(post);
}

// sort al posts descending date
allPosts = allPosts.sort((a, b)=>{ 
    return a.date > b.date ? -1 :
    a.date < b.date ? 1 :
    0;
})

for (let i = 0; i < allPosts.length; i ++){
    let post = allPosts[i],
        previousPost = null;
        nextPost = null;

    if (i > 0)
        previousPost = allPosts[i - 1];

    if (i < allPosts.length -1)
        nextPost = allPosts[i + 1];

    let rendered = pages.post({ previousPost, nextPost, post, blogName, menuItems });
    let postPath = path.join(outFolder, post.filename) + '.html';
    fs.writeFileSync(postPath, rendered);
    console.log(`Published ${post.filename}`);
}


// archive posts
paginate(allPosts, 'archive', 'archive', archivePageSize, {}, archiveFolder);


// paginates a collection of posts, use for archive pages, tag pages etc
// items : collection of posts or tags to paginate
function paginate(items, pageBaseName, pageName, pageSize, model, outFolder){
    let index = 0;

    while (true){
        const page = items.slice(index * pageSize, index * pageSize + pageSize),
            nextPage = items.slice((index + 1) * pageSize, (index + 1) * pageSize + pageSize);

        if (!page.length)
            break;

        model.posts = page;
        model.blogName = blogName;
        model.menuItems = menuItems;

        model.prev = undefined;
        if (index > 0)
            model.prev = index - 1;

        model.next = undefined;
        if (nextPage.length)
            model.next = index + 1;

        const rendered = pages[pageName](model);
        
        fs.writeFileSync(path.join(outFolder, `${pageBaseName}${index ? `-${index}` : ''}.html`), rendered);

        index ++;
    }
}


// tag pages
let tags = {}
// get unique list of all tags for all posts
for (const post of allPosts)
    for (const tag of post.tags)
        tags[tag] = '';


// tag cloud page
let tagCloud = [];
for (const tag in tags){
    const urlFriendlyTag = tag.replace(/\s/g, '-'),
        postsWithTag = allPosts.filter((post)=> { return post.tags.includes(tag) });

    paginate(postsWithTag, urlFriendlyTag, 'tag', archivePageSize, { title : tag, urlFriendlyTag }, tagsFolder);
    console.log(`Published index page(s) for tag ${tag}`);

    tagCloud.push({
        weight: postsWithTag.length,
        tag: tag,
        url : urlFriendlyTag
    });
}

// tags page
fs.writeFileSync(path.join(tagsFolder, 'index.html'), pages.tags({ menuItems, blogName : blogName, tags : tagCloud}));


// posts as index
paginate(allPosts, 'index', 'index', pageSize, {}, outFolder);


// rss feed
const feed = new RSS({
    title: blogName,
    description: blogDescription,
    feed_url: urljoin(baseurl, `rss.xml`),
    site_url: baseurl,
    copyright: new Date().getFullYear()
});

for (const post of allPosts)
    feed.item({
        title: post.title,
        description: post.description,
        url: urljoin(baseurl, `${post.url}.html`),
        categories: post.tags,
        date: post.date
    });

fs.writeFileSync(path.join(outFolder, 'rss.xml'), feed.xml());


// sitemap
let sitemapUrls = [{ url : 'index.html', changefreq: 'always' /*, priority : '0.1'*/ }];
for (const post of allPosts){
    sitemapUrls.push({
        url : urljoin(baseurl, `${post.url}.html`),
        changefreq : 'monthly'/*,
        priority : '0.5'*/
    });
}

let map = sitemap.createSitemap({  
    hostname: baseurl,
    urls: sitemapUrls    
});
map.toXML( function(err, xml){ 
    if (err) 
        console.log(xml) 
});
fs.writeFileSync(path.join(outFolder, 'sitemap.xml'), map.toString());
console.log('Done');