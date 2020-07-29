module.exports = async (options = {})=>{

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
        menuItems = []

    const opts = Object.assign({
            defaultHero : '',
            baseUrl :'https://example.com',
            staticContentFileGlob : '**/*.{png,gif,jpg}',
            prettifyUrls: true,
            blogDescription  : 'Your blog description here',
            blogName : 'Your blog name here', 
            pageSize : 10,
            archivePageSize : 10,
            allowHeaderless : false,
            themeFolder : path.join(__dirname, 'theme'),
            markdownFolder : path.join(__dirname, 'posts'),
            outFolder : path.join(__dirname, 'web'),
            // to make it easier to develop locally you can host static assets (css, js, images etc) in your output folder without having
            // these be destroyed by the build process' cleanup
            outProtectedFolders : ['**/static/**']
        }, options),
        tagsFolder = path.join(opts.outFolder, 'tags'),
        archiveFolder = path.join(opts.outFolder, 'archive')
    
    opts.staticFolder = path.join(opts.themeFolder, 'static')
    opts.templatesFolder = path.join(opts.themeFolder, 'templates')
    if (!await fs.exists(opts.templatesFolder))
        return console.log(`Expected templates folder not found @ ${opts.templatesFolder}`)

    
    fs.ensureDirSync(opts.outFolder)
    fs.ensureDirSync(tagsFolder)
    fs.ensureDirSync(archiveFolder)

    Handlebars.registerHelper(layouts(Handlebars))

    // nuke everything in render folder except for protected folders
    const htmlFiles = glob.sync(path.join(opts.outFolder, '**/*.*'), { ignore : opts.outProtectedFolders })
    for (const file of htmlFiles)
        await fs.remove(file)

    // Handlebars : register partial templates
    const partialPaths = glob.sync(path.join(opts.templatesFolder, 'partials/**/*.hbs')) 
    for (const partialPath of partialPaths){
        const content = fs.readFileSync(partialPath, 'utf8'),
            name = path.basename(partialPath).match(/(.*).hbs/).pop(); 

        Handlebars.registerPartial(name, content);
    }

    // Handlebars : register templates
    const pagePaths = glob.sync(path.join(opts.templatesFolder, 'pages/**/*.hbs')) 
    for (const pagePath of pagePaths){
        const content = fs.readFileSync(pagePath, 'utf8'),
            name = path.basename(pagePath).match(/(.*).hbs/).pop()

        templates[name] = Handlebars.compile(content)
    }

    // Handlebars : register helpers
    const helperPaths = glob.sync(path.join(opts.templatesFolder, 'helpers/**/*.js')) 
    for (const helperPath of helperPaths){
        let commonJSPath = path.resolve(helperPath)
        commonJSPath = commonJSPath.substring(0, commonJSPath.length - 3)
        require(commonJSPath)
    }

    /**
     * extract models from the top of markdown files
     * required fields for model :
     * - title
     * - date : must be a parsable Javascript date
     * Note as well that the field "markup" is reserved, and will end up containing the markup rendered from markdown content
     */ 
    const markdownFolder = path.resolve(opts.markdownFolder),
        postPaths = glob.sync(path.join(markdownFolder, '**/*.md'))

    console.log(`found ${postPaths.length} posts to render.`)

    for (const postPath of postPaths){

        let post = {},
            content = fs.readFileSync(postPath, 'utf8'),
            lines = content.split('\n'),
            // post url is its entire path under ./posts, minus extension, for example "./posts/foo/bar.md" becomes "/foo/bar".
            postNameOnDisk = postPath.substring(markdownFolder.length).match(/(.*).md/).pop() // remove leading "/posts" and file extension

        // find the position of the dividing line between post data and markup. dividing line is 3 or more dashes
        let dividerLineCount = null
        for (let i = 0; i < lines.length; i ++){
            if (lines[i].match(/-{3,}/)){
                dividerLineCount = i
                break
            }
        }

        if (!opts.allowHeaderless && !dividerLineCount){
            console.log(`WARNING : post ${postNameOnDisk} does not contain a valid data header, it won't be published.`)
            continue
        }

        // parse each line from data header as a name:value property for model.
        if (dividerLineCount){
            let lineIndex = 0
            while (lineIndex < dividerLineCount){
    
                let groups = lines[lineIndex].match(/(.*?):(.*)/);
                if (!groups || groups.length !== 3){
                    console.error(`WARNING : ${lines[lineIndex]} in post ${postNameOnDisk} is not properly formatted, NAME:VALUE is expected.`)
                    lineIndex ++
                    continue
                }
                
                post[groups[1].trim()] = groups[2].trim()
                lineIndex ++
            }
        }

        if (!post.title){
            post.title = fsUtils.fileNameWithoutExtension(postPath)
            console.error(`WARNING : post "${postNameOnDisk}" has an empty title, falling back to filename.`)
        }

        // tags are optional, if none are defined, create empty list. tags must be entered as comma-separated
        // list, but are converted to array
        post.tags = post.tags || ''
        post.hero = post.hero || opts.defaultHero


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
            const stats = fs.statSync(postPath)
            post.date = stats.mtime
            console.error(`WARNING : post ${postNameOnDisk} has an invalid or missing date, falling back to file date.`)
        }

        // post url is locked to the relative path+name of its markdown file
        post.url = `${postNameOnDisk}.html`;
        if (opts.prettifyUrls && post.url.toLowerCase().endsWith('/index.html'))
            post.url = path.dirname(postNameOnDisk);

        // markdown is everything after data line divider
        post.markdown = lines.slice(dividerLineCount + 1).join('\n');

        post.markup = converter.makeHtml(post.markdown);

        // keywords are primarily intended for metadata, and are simply the concatenated tag list
        post.keywords = post.tags.join(',');

        postsHash[postNameOnDisk] = post
    }


    // index.html is reserved, warn user if post called "index" is found
    if (postsHash.index){
        console.error('WARNING - you have a post called "index", this name is reserved and will always be overwritten');
    }


    // sync static files from ./posts folder 
    const staticFiles = glob.sync(path.join(markdownFolder, `${opts.staticContentFileGlob}`)) 
    for (const syncFile of staticFiles){
        const targetFile = syncFile.substring(markdownFolder.length),
            targetPath = path.join(opts.outFolder, targetFile)
            
        fs.copySync(syncFile, targetPath)
        console.log(`copied static file "${syncFile}" to "${targetPath}"`)
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
            nextPost = posts[i - 1];

        if (i < posts.length -1)
            previousPost = posts[i + 1];

        let rendered = templates.post({ previousPost, nextPost, post, blogName : opts.blogName, menuItems });
        let postPath =`${path.join(opts.outFolder, post.filename)}.html`;
        fs.ensureDirSync(path.dirname(postPath));
        
        // strip <pre> indentation, this normalized padded for code blocks etc
        rendered = stripIndent(rendered);

        fs.writeFileSync(postPath, rendered);
        console.log(`Published ${post.filename}`);
    }

    // context is the "public" data that will be sent to all plugins. This needs to contain everything that plugins
    // need to do their work
    let context = {
        blogName : opts.blogName,
        blogDescription : opts.blogDescription,
        baseUrl : opts.baseUrl,
        outFolder : opts.outFolder,
        posts,
        menuItems,
        templates
    };


    // create archive pages
    paginate(context, posts, 'archive', 'archive', opts.archivePageSize, {}, archiveFolder);


    // get unique list of all tags across all posts
    for (const post of posts)
        for (const tag of post.tags)
            tags[tag] = '';


    // create tags page
    let tagCloud = [];
    for (const tag in tags){
        const urlFriendlyTag = tag.replace(/\s/g, '-'),
            postsWithTag = posts.filter((post)=> { return post.tags.includes(tag) });

        paginate(context, postsWithTag, urlFriendlyTag, 'tag', opts.archivePageSize, { title : tag, urlFriendlyTag }, tagsFolder);
        console.log(`Published index page(s) for tag ${tag}`);

        tagCloud.push({
            weight: postsWithTag.length,
            tag: tag,
            url : urlFriendlyTag
        });
    }

    // tags page
    fs.writeFileSync(path.join(tagsFolder, 'index.html'), templates.tags({ menuItems, blogName : opts.blogName, tags : tagCloud}));

    // create index page
    paginate(context, posts, 'index', 'index', opts.pageSize, {}, opts.outFolder)

    // if static folder exists in theme, copy all to deploy path
    if (await fs.exists(opts.staticFolder))
        await fs.copy(opts.staticFolder, path.join(opts.outFolder, 'static'))

    const plugins = fsUtils.readFilesUnderDirSync(path.join(__dirname, 'lib/plugins'))
    for(let pluginPath of plugins){
        try {
            pluginPath = fsUtils.fullPathWithoutExtension(pluginPath);
            const plugin = require(pluginPath)
            plugin(context)
            console.log(`Ran ${fsUtils.fileNameWithoutExtension(pluginPath)} plugin`)
        }catch(ex){
            console.error(`Error running plugin ${pluginPath}`)
            console.error(ex)
        }
    }

}


