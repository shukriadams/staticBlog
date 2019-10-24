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
    converter = new showdown.Converter({ tables : true }),
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

// to make it easier to keep static content like css, JS etc in /web for live updating, we reserve web/static for that content. Everything outside this folder will be
// nuked during cleanup.
if (fs.existsSync('./posts/static')){
    console.log('ERROR : "posts/static" is a reserved folder name and may collide with protected static content in web/static. Please remove this folder.');
    process.exit(1);
}

// clean up rendered files
const htmlFiles = glob.sync(path.join(outFolder, '**/*.*'), { ignore : path.join(outFolder, 'static/**') });
for (let file of htmlFiles)
    fs.unlinkSync(file);


// register partial templates
const partialPaths = glob.sync('./templates/partials/**/*.hbs'); 
for (let partialPath of partialPaths){
    let content = fs.readFileSync(partialPath, 'utf8'),
        name = path.basename(partialPath).match(/(.*).hbs/).pop(); 

    Handlebars.registerPartial(name, content);
}

// register page templates
const pagePaths = glob.sync('./templates/pages/**/*.hbs'); 
for (let pagePath of pagePaths){
    let content = fs.readFileSync(pagePath, 'utf8'),
        name = path.basename(pagePath).match(/(.*).hbs/).pop(); 

    pages[name] = Handlebars.compile(content);
}

// register helpers
const helperPaths = glob.sync('./templates/helpers/**/*.js'); 
for (let helperPath of helperPaths){
    require(helperPath);
}



/**
 * extract models from the top of markdown files
 * required fields for model :
 * - title
 * - date : must be a parsable Javascript date
 * Note as well that the field "markup" is reserved, and will end up containing the markup rendered from markdown content
 */ 
const markdownPaths = glob.sync('./posts/**/*.md'); 
console.log(`found ${markdownPaths.length} articles to render.`);

for (const markdownPath of markdownPaths){
    
    // post name is its entire path under ./posts, minus extension, for example "./posts/foo/bar.md" becomes "/foo/bar". The
    // leading / is important for relative HTML mapping to work
    let post = {},
        content = fs.readFileSync(markdownPath, 'utf8'),
        name = markdownPath.substring('./posts'.length).match(/(.*).md/).pop(),
        lines = content.split('\n'); 

    // find the position of the dividing line between post data and markup. dividing line is 3 or more dashes, egs "---"
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

    // parse each line from data header as a name:value property for model.
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

    // remove empty items
    post.tags = post.tags.split(',').filter((tag)=>{ return tag.length > 0;}); 

    // remove whitespace around each tag
    post.tags = post.tags.map((tag)=>{return tag.trim()}); 

    // force convert date string to date object. Any valid JS datestring is valid.
    post.date = new Date(post.date);
    if (isNaN(post.date)){
        console.error(`WARNING : post ${name} has an invalid or missing date, it won't be published.`);
        continue;
    }

    // post url is locked to the relative path+name of its markdown file
    post.url = `${name}`;

    // convert markdown (everything after model divider line) into HTML
    post.markup = lines.slice(dividerLineCount + 1).join('\n');
    post.markup = converter.makeHtml(post.markup);

    post.keywords = post.tags.join(',');
    posts[name] = post;
}


// index.html is reserved, warn user if post called "index" is found
if (posts.index){
    console.error('WARNING - you have a post called "index", this name is reserved and will always be overwritten');
}


// sync static files from ./posts folder - this is options
if (process.env.syncStaticPostFiles){
    const syncFiles = glob.sync('./posts/' + '**/*.{png,gif,jpg}'); 
    for (const syncFile of syncFiles){
        const targetFile = syncFile.substring('./posts'.length);
        fs.copySync(syncFile, path.join(outFolder, targetFile));
    }
}



let tags = {},
    menuItems = [],
    allPosts = [];

// convert posts object into allPosts array
// also build up array of posts which must appear as header menu items
for (const prop in posts){
    let post = posts[prop];
    post.filename = prop;
    allPosts.push(post);

    if (post.menu)
        menuItems.push(post);
}

// sort all posts by descending date
allPosts = allPosts.sort((a, b)=>{ 
    return a.date > b.date ? -1 :
    a.date < b.date ? 1 :
    0;
})

// generate html page for each post
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
    fs.ensureDirSync(path.dirname(postPath));
    fs.writeFileSync(postPath, rendered);
    console.log(`Published ${post.filename}`);
}

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

// create archive pages
paginate(allPosts, 'archive', 'archive', archivePageSize, {}, archiveFolder);


// get unique list of all tags across all posts
for (const post of allPosts)
    for (const tag of post.tags)
        tags[tag] = '';


// create tags page
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


// create index page
paginate(allPosts, 'index', 'index', pageSize, {}, outFolder);


// create rss feed
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


// create sitemap
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