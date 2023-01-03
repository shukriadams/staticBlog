module.exports = async (options = {})=>{

    let glob = require('glob'),
        path = require('path'),
        fs = require('fs-extra'),
        exec = require('madscience-node-exec'),
        childProcess = require('child_process'),
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
        opts = Object.assign({
            defaultHero : '',
            baseUrl :'https://example.com',
            useGitHistoryForDates : true,
            staticContentFileGlob : '**/*.{png,gif,jpg}',
            
            pageSize : 9,
            archivePageSize : 10,
            allowHeaderless : false,
            showUpdateDates : true,

            // an array of post paths never to publish
            block : [],

            // Use this model to set properties for all pages
            commonModel : {
                name : 'Your blog name here',
                description : 'Your blog description here',
                footer : {
                    text : `Copyright ${new Date().getFullYear()}`
                }
            },
            coreFolder : path.join(__dirname, 'theme', 'static'),
            themeFolder : path.join(__dirname, 'theme'),
            additionalPartialsFolder: null,
            markdownFolder : path.join(__dirname, 'posts'),
            outFolder : path.join(__dirname, 'web'),
            // to make it easier to develop locally you can host static assets (css, js, images etc) in your output folder without having
            // these be destroyed by the build process' cleanup
            outProtectedFolders : ['**/static/**']
        }, options),
        tagsFolder = path.join(opts.outFolder, 'tags'),
        archiveFolder = path.join(opts.outFolder, 'archive')
        
    const webpackBuild = async ()=>{
        return new Promise((resolve, reject)=>{
            try {
                var child = childProcess.exec('npm run build', { cwd  : __dirname } )
                child.stdout.pipe(process.stdout)
                child.on('exit', ()=>{
                    resolve()
                })
            } catch (ex) {
                reject(ex)
            }
        })
    }

    await webpackBuild()

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

    // Handlebars : register partial& templates
    const partialPaths = glob.sync(path.join(opts.templatesFolder, 'partials/**/*.hbs')) 
    for (const partialPath of partialPaths){
        const content = fs.readFileSync(partialPath, 'utf8'),
            name = path.basename(partialPath).match(/(.*).hbs/).pop(); 

        Handlebars.registerPartial(name, content);
    }

    // Handlebars : register optional additioanl partials
    if (opts.additionalPartialsFolder){
        const additionPartials = glob.sync(path.join(opts.additionalPartialsFolder, '**/*.hbs')) 
        for (const additionPartial of additionPartials){
            const content = fs.readFileSync(additionPartial, 'utf8'),
                name = path.basename(additionPartial).match(/(.*).hbs/).pop()
    
            Handlebars.registerPartial(name, content);
        }
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
        postUrls = [],
        postPaths = glob.sync(path.join(markdownFolder, '**/*.md'))

    console.log(`found ${postPaths.length} posts to render.`)

    for (const postPath of postPaths){

        let post = {
                // default post model values go here
                publish : true
            },
            content = fs.readFileSync(postPath, 'utf8'),
            lines = content.split('\n')

        // post default url is its entire path under ./posts, minus extension, for example "./posts/foo/bar.md" becomes "/foo/bar".
        post.postNameOnDisk = postPath.substring(markdownFolder.length).match(/(.*).md/).pop() // remove leading "/posts" and file extension

        if (opts.block.includes(post.postNameOnDisk))
            continue

        // find the position of the dividing line between post data and markup. dividing line is 3 or more dashes
        let dividerLineCount = null
        for (let i = 0; i < lines.length; i ++)
            if (lines[i].match(/-{3,}/)){
                dividerLineCount = i
                break
            }
        

        if (!opts.allowHeaderless && !dividerLineCount){
            console.log(`WARNING : post ${post.postNameOnDisk} does not contain a valid data header, it won't be published.`)
            continue
        }

        // parse each line from data header as a name:value property for model.
        if (dividerLineCount){
            let lineIndex = 0
            while (lineIndex < dividerLineCount){
    
                let groups = lines[lineIndex].match(/(.*?):(.*)/)
                if (!groups || groups.length !== 3){
                    console.error(`WARNING : ${lines[lineIndex]} in post ${post.postNameOnDisk} is not properly formatted, NAME:VALUE is expected.`)
                    lineIndex ++
                    continue
                }
                
                post[groups[1].trim()] = groups[2].trim()
                lineIndex ++
            }
        }

        // if post has no title, fall back to post file name
        if (!post.title){
            post.title = fsUtils.fileNameWithoutExtension(postPath)
            console.error(`WARNING : post "${post.postNameOnDisk}" has an empty title, falling back to filename.`)
        }

        
        // URL //////////////////////////////////////////////////////////////
        // if post url is not explicitly set then we use the file relative path for url
        if (!post.url){
            post.url = post.postNameOnDisk
            if (fsUtils.fileNameWithoutExtension(post.postNameOnDisk).toLowerCase() === 'index')
                post.url = path.dirname(post.postNameOnDisk)
        }

        // ensure url is unique
        if (postUrls.includes(post.url))
            return console.log(`ERROR : the post url ${post.url} is bound more than once. Url is either set in a header twice, or is set once but collides with anther post path`)

        postUrls.push(post.url)


        // HERO //////////////////////////////////////////////////////////////
        post.hero = post.hero || opts.defaultHero

        // force hero path to be relative to post, if the hero path starts with './'
        if (post.hero.startsWith('./'))
            post.hero = `${post.url}/${post.hero.substring(2)}`


        // TAGS //////////////////////////////////////////////////////////////
        // tags are optional, if none are defined, create empty list. tags must be entered as comma-separated
        // list, but are converted to array
        post.tags = post.tags || ''
        // remove empty items from tags list
        post.tags = post.tags.split(',').filter((tag)=>{ return tag.length > 0 })

        // remove whitespace around each tag
        post.tags = post.tags.map((tag)=>{return tag.trim()}) 


        // DATES //////////////////////////////////////////////////////////////
        // get update date from git if none set
        if (opts.showUpdateDates && opts.useGitHistoryForDates && !post.updated){
            try {
                const updateCheck = await exec.sh({  cmd : `git log -1 --pretty="format:%ci" ${postPath}` })
                if (updateCheck.code === 0)
                    post.updated = new Date(updateCheck.result)
            } catch (ex){
                console.log(`error reading git history of file ${postPath} - ${ex}`)
            }
        }

        // try to parse the date given in the header 
        if (post.date){
            try {
                post.date = new Date(post.date)
            } catch(ex){
                console.log(`WARNING : ${postPath} contains an invalid date ${post.date}`)
            }
        }

        post.isUpdated = post.updated > post.date

        // render markdown - markdown is everything after the header location
        post.markdown = lines.slice(dividerLineCount + 1).join('\n')
        post.markup = converter.makeHtml(post.markdown)

        // keywords are intended for HTML header metadata, and are simply the concatenated tag list
        post.keywords = post.tags.join(',')

        // pass common model to each post 
        post.common = opts.commonModel

        if (post.block === 'true')// header model is string only
            console.log(`Post ${post.postNameOnDisk} will not be published`)
        else
            postsHash[post.url] = post
    }

    // index.html is reserved, warn user if post called "index" is found
    if (postsHash.index)
        console.error('WARNING - you have a post called "index", this name is reserved and will always be overwritten')
    

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
        const post = postsHash[prop]
        posts.push(post)

        if (post.menu)
            menuItems.push(post)
    }

    // sort all posts by descending date
    
    posts = posts.sort((a, b)=>{ 
        let dateA = a.date,
            dateB = b.date

        if (a.isUpdated)
            dateA = a.updated

        if (b.isUpdated)
            dateB = b.updated

        if (!dateA)
            dateA = new Date('1970-1-1')
            
        if (!dateB)
            dateA = new Date('1970-1-1')

        return dateA > dateB ? -1 :
            dateA < dateB ? 1 :
            0
    })
    
    // assign weight to each post, this is used for rendering size
    for (let i = 0 ; i < posts.length ; i ++){
        let post = posts[i];
        post.weight = i === 0 ? 'Top' :
            i < 3 ? 'Medium' : 
            'Standard'
    }

    // generate html page for each post
    for (let i = 0; i < posts.length; i ++){
        let post = posts[i],
            previousPost = null
            nextPost = null

        if (i > 0)
            nextPost = posts[i - 1]

        if (i < posts.length -1)
            previousPost = posts[i + 1]

        let rendered = templates.post({ 
                previousPost, 
                nextPost, 
                post, 
                headTitle : `${post.title} - ${opts.commonModel.name}`,
                common: opts.commonModel,
                blogName : opts.blogName, 
                menuItems 
            }),
            postPath =`${path.join(opts.outFolder, post.url)}/index.html`

        fs.ensureDirSync(path.dirname(postPath))
        
        // strip <pre> indentation, this normalized padded for code blocks etc
        rendered = stripIndent(rendered)

        fs.writeFileSync(postPath, rendered)
        console.log(`Published ${post.postNameOnDisk}`)
    }

    // context is the "public" data that will be sent to all plugins. This needs to contain everything that plugins
    // need to do their work
    let context = {
        blogDescription : opts.blogDescription,
        baseUrl : opts.baseUrl,
        outFolder : opts.outFolder,
        posts,
        menuItems,
        templates
    }


    // create archive pages
    paginate(context, posts, 'archive', 'archive', opts.archivePageSize, 
        { 
            headTitle: `Archive - ${opts.commonModel.name}`,
            common : opts.commonModel 
        }, 
        archiveFolder);


    // get unique list of all tags across all posts
    for (const post of posts)
        for (const tag of post.tags)
            tags[tag] = '';


    // create tags page
    let tagCloud = [];
    for (const tag in tags){
        const urlFriendlyTag = tag.replace(/\s/g, '-'),
            postsWithTag = posts.filter((post)=> { return post.tags.includes(tag) });

        paginate(context, postsWithTag, urlFriendlyTag, 'tag', opts.archivePageSize, { 
            title : tag, 
            headTitle : `Tag:${tag} - ${opts.commonModel.name}`,
            urlFriendlyTag, 
            common : opts.commonModel 
        }, tagsFolder)

        console.log(`Published index page(s) for tag ${tag}`);

        tagCloud.push({
            weight: postsWithTag.length,
            tag: tag,
            url : urlFriendlyTag
        });
    }

    // tags page
    fs.writeFileSync(path.join(tagsFolder, 'index.html'), templates.tags({ 
        menuItems, 
        headTitle : `Tags - ${opts.commonModel.name}`,
        common : opts.commonModel, 
        tags : tagCloud 
    }))

    // create index page
    paginate(context, 
            posts, 
            'index', 
            'index', 
            opts.pageSize, 
            {
                headTitle : opts.commonModel.name,
                common : opts.commonModel 
            }, 
            opts.outFolder)

    // if static folder exists in theme, copy all to deploy path
    await fs.copy(opts.coreFolder, path.join(opts.outFolder, 'static'))

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

