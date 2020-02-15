// load .env file first, this will be used to define consts below
require('custom-env').env();

let 
    glob = require('glob'),
    path = require('path'),
    fs = require('fs-extra'),
    process = require('process'),
    showdown  = require('showdown'),
    Handlebars = require('handlebars'),
    layouts = require('handlebars-layouts'),
    stripIndent = require('strip-pre-indent'),
    fsUtils = require('madscience-fsUtils'),
    paginate = require('./lib/paginate'),
    converter = new showdown.Converter({ 
        tables : true 
    }),
    templates = {},
    postsHash = {},
    posts = [],
    tags = {},
    menuItems = [],
    pageSize = parseInt(process.env.PAGE_SIZE ? process.env.PAGE_SIZE : '3'),
    archivePageSize = parseInt(process.env.ARCHIVE_PAGE_SIZE ? process.env.ARCHIVE_PAGE_SIZE : '3'),
    blogName = process.env.BLOG_NAME ? process.env.BLOG_NAME.trim() : 'Your blog name here', 
    blogDescription = process.env.BLOG_DESCRIPTION ? process.env.BLOG_DESCRIPTION.trim() : 'Your blog description here', 
    prettifyUrls = process.env.PRETTIFY_URLS ? process.env.PRETTIFY_URLS === 'true' : true,
    staticContentFileGlob = process.env.STATIC_CONTENT_GLOB ? process.env.STATIC_CONTENT_GLOB.trim() : '**/*.{png,gif,jpg}',
    baseUrl = process.env.BASE_URL ? process.env.BASE_URL.trim() : 'https://example.com',
    defaultHero = process.env.DEFAULT_HERO ? process.env.DEFAULT_HERO.trim() : '',
    outFolder = './web',
    // tags and archives are placed in their own folders to avoid collision with posts
    tagsFolder = path.join(outFolder, 'tags'),
    archiveFolder = path.join(outFolder, 'archive');


fs.ensureDirSync(outFolder);
fs.ensureDirSync(tagsFolder);
fs.ensureDirSync(archiveFolder);

Handlebars.registerHelper(layouts(Handlebars));

// to make it easier to keep static content like css, JS etc in /web for live updating, we reserve the path 
// web/static for that content (everything outside this folder is nuked during cleanup). Ensure that no post
// will collide with this reserved folder
if (fs.existsSync('./posts/static')){
    console.log('ERROR : "posts/static" is a reserved folder name and may collide with protected static content in web/static. Please remove this folder.');
    process.exit(1);
}

// nuke everything in render folder except for ./static
const htmlFiles = glob.sync(path.join(outFolder, '**/*.*'), { ignore : path.join(outFolder, 'static/**') });
for (let file of htmlFiles)
    fs.unlinkSync(file);


// Handlebars : register partial templates
const partialPaths = glob.sync('./templates/partials/**/*.hbs'); 
for (let partialPath of partialPaths){
    let content = fs.readFileSync(partialPath, 'utf8'),
        name = path.basename(partialPath).match(/(.*).hbs/).pop(); 

    Handlebars.registerPartial(name, content);
}

// Handlebars : register templates
const pagePaths = glob.sync('./templates/pages/**/*.hbs'); 
for (let pagePath of pagePaths){
    let content = fs.readFileSync(pagePath, 'utf8'),
        name = path.basename(pagePath).match(/(.*).hbs/).pop(); 

    templates[name] = Handlebars.compile(content);
}

// Handlebars : register helpers
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
const postPaths = glob.sync('./posts/**/*.md'); 
console.log(`found ${postPaths.length} posts to render.`);

for (const postPath of postPaths){
    
    let post = {},
        content = fs.readFileSync(postPath, 'utf8'),
        lines = content.split('\n'),
        // post url is its entire path under ./posts, minus extension, for example "./posts/foo/bar.md" becomes "/foo/bar".
        postNameOnDisk = postPath.substring('./posts'.length).match(/(.*).md/).pop(); // remove leading "/posts" and file extension

    // find the position of the dividing line between post data and markup. dividing line is 3 or more dashes, egs "---"
    let dividerLineCount = null;
    for (let i = 0 ; i < lines.length; i ++){
        if (lines[i].match(/^-+/)){
            dividerLineCount = i;
            break;
        }
    }

    if (!dividerLineCount){
        console.log(`WARNING : post ${postNameOnDisk} does not contain a valid data header, it won't be published.`);
        continue;
    }

    // parse each line from data header as a name:value property for model.
    let lineIndex = 0;
    while (lineIndex < dividerLineCount){

        let groups = lines[lineIndex].match(/(.*?):(.*)/);
        if (!groups || groups.length !== 3){
            console.error(`WARNING : ${lines[lineIndex]} in post ${postNameOnDisk} is not properly formatted, NAME:VALUE is expected.`);
            lineIndex++;          
            continue;
        }
        
        post[groups[1].trim()] = groups[2].trim();
        lineIndex++;          
    }

    if (!post.title){
        console.error(`WARNING : post "${postNameOnDisk}" has an empty title, it won't be published.`);
        continue;
    }

    // tags are optional, if none are defined, create empty list. tags must be entered as comma-separated
    // list, but are converted to array
    post.tags = post.tags || '';
    post.hero = post.hero || defaultHero;


    // force hero path to be relative to post, if the hero path starts with './'
    if (post.hero.startsWith('./'))
        post.hero = `${path.dirname(postNameOnDisk)}/${post.hero.substring(2)}`;

    // remove empty items from tags list
    post.tags = post.tags.split(',').filter((tag)=>{ return tag.length > 0;}); 

    // remove whitespace around each tag
    post.tags = post.tags.map((tag)=>{return tag.trim()}); 

    // force convert date string to date object. Any valid JS datestring is valid.
    post.date = new Date(post.date);
    if (isNaN(post.date)){
        console.error(`WARNING : post ${postNameOnDisk} has an invalid or missing date, it won't be published.`);
        continue;
    }

    // post url is locked to the relative path+name of its markdown file
    post.url = `${postNameOnDisk}.html`;
    if (prettifyUrls && post.url.toLowerCase().endsWith('/index.html'))
        post.url = path.dirname(postNameOnDisk);

    // convert markdown (everything after model divider line) into HTML
    post.markup = lines.slice(dividerLineCount + 1).join('\n');
    post.markup = converter.makeHtml(post.markup);

    // keywords are primarily intended for metadata, and are simply the concatenated tag list
    post.keywords = post.tags.join(',');

    postsHash[postNameOnDisk] = post;
}


// index.html is reserved, warn user if post called "index" is found
if (postsHash.index){
    console.error('WARNING - you have a post called "index", this name is reserved and will always be overwritten');
}


// sync static files from ./posts folder - this is options
const staticFiles = glob.sync(`./posts/${staticContentFileGlob}`); 
for (const syncFile of staticFiles){
    const targetFile = syncFile.substring('./posts'.length);
    fs.copySync(syncFile, path.join(outFolder, targetFile));
}


// convert posts object into posts array
// also build up array of posts which must appear as header menu items
for (const prop in postsHash){
    let post = postsHash[prop];
    post.filename = prop;
    posts.push(post);

    if (post.menu)
        menuItems.push(post);
}

// sort all posts by descending date
posts = posts.sort((a, b)=>{ 
    return a.date > b.date ? -1 :
    a.date < b.date ? 1 :
    0;
})


// assign weight to each post, this is used for rendering size
for (let i = 0 ; i < posts.length ; i ++){
    let post = posts[i];
    post.weight = i === 0 ? 'Top' :
        i < 3 ? 'Medium' : 
        'Standard';
}


// generate html page for each post
for (let i = 0; i < posts.length; i ++){
    let post = posts[i],
        previousPost = null;
        nextPost = null;

    if (i > 0)
        previousPost = posts[i - 1];

    if (i < posts.length -1)
        nextPost = posts[i + 1];

    let rendered = templates.post({ previousPost, nextPost, post, blogName, menuItems });
    let postPath =`${path.join(outFolder, post.filename)}.html`;
    fs.ensureDirSync(path.dirname(postPath));
    
    // strip <pre> indentation, this normalized padded for code blocks etc
    rendered = stripIndent(rendered);

    fs.writeFileSync(postPath, rendered);
    console.log(`Published ${post.filename}`);
}

// context is the "public" data that will be sent to all plugins. This needs to contain everything that plugins
// need to do their work
let context = {
    blogName,
    blogDescription,
    baseUrl,
    outFolder,
    posts,
    menuItems,
    templates
};


// create archive pages
paginate(context, posts, 'archive', 'archive', archivePageSize, {}, archiveFolder);


// get unique list of all tags across all posts
for (const post of posts)
    for (const tag of post.tags)
        tags[tag] = '';


// create tags page
let tagCloud = [];
for (const tag in tags){
    const urlFriendlyTag = tag.replace(/\s/g, '-'),
        postsWithTag = posts.filter((post)=> { return post.tags.includes(tag) });

    paginate(context, postsWithTag, urlFriendlyTag, 'tag', archivePageSize, { title : tag, urlFriendlyTag }, tagsFolder);
    console.log(`Published index page(s) for tag ${tag}`);

    tagCloud.push({
        weight: postsWithTag.length,
        tag: tag,
        url : urlFriendlyTag
    });
}

// tags page
fs.writeFileSync(path.join(tagsFolder, 'index.html'), templates.tags({ menuItems, blogName : blogName, tags : tagCloud}));

// create index page
paginate(context, posts, 'index', 'index', pageSize, {}, outFolder);


const plugins = fsUtils.readFilesUnderDirSync('./lib/plugins');
for(let pluginPath of plugins){
    try {
        pluginPath = fsUtils.fullPathWithoutExtension(pluginPath);
        const plugin = require(`./${pluginPath}`);
        plugin(context);
        console.log(`Ran ${fsUtils.fileNameWithoutExtension(pluginPath)} plugin`);
    }catch(ex){
        console.error(`Error running plugin ${pluginPath}`);
        console.error(ex);
    }
}
