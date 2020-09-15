
# Static Blog

## Why?

There are plenty of static blog rendering engines out there, this one does the following things specifically 

- Uses markdown as its source. Markdown is a wonderful source format because it's human readable yet powerful enough to be consumable by HTML render systems. It's the document equivalent of JSON. By writing content in markdown, your posts can be ported to other/future engines, while remaining readably by you. Your work will not be mangled and locked inside an SQL database that you will have to carry with you forever. Store your posts in a git repo, on your harddisk, on a cloud drive, even under your mattress. Edit them in any text editor you want. Go, be free!
- Requires minimal boilerplate - this engine will render any collection of markdown files, requiring only package.json and a single build file. 
- Uses Handlebars for markup. This is still my favorite templating engine.
- Markup can be organized into themes

## Standard Blog Features

- supports static assets
- Supports organzing post and related assets by folder
- Supports tags
- Supports pinning of posts to header
- Includes support for client-side text search 
- Includes RSS feed

## Simple use

Add to your package.json 

    {
       "dependencies": {
                "staticblog": "https://github.com/shukriadams/staticblog.git#1.0.0"
        }
    }

In a .js file, point it to a folder containing markdown files, and specify an output folder

    (async()=>{
        const blogEngine = require('staticblog')
        await blogEngine({
            markdownFolder : './posts',
            outFolder : './web'
        })
    })()

Server the contents of ./web with whatever HTTP server you want, example
    
    cd ./web
    python -m SimpleHTTPServer

Upload the contents of ./web to any HTTP web server and you're golden.

## Requirements

- NodeJS 8 or higher

## Posts

- Each markdown file becomes a post.
- A post file's name will become its url.

### Post data headers

You can add an optional YML-like header to a markfile to add to it. This header consists of name:value lines, and is terminated with at least three dashes.
   
    title: 10 reasons cats exist, you won't believe 11
    date: 2000-12-25
    tags: cats, pets, mammals, existentialist horror
    description: An in-depth analysis into whether cats exist, or do we?
    menu: true
    category: philosophy/existentialist/horror
    mycatnames: Cathulu, Innsmeouth, Mountains of Meowdness
    ---
    ## Are cats our cosmic overlords?

    Here is some fascinating markdown about cats ...

The following fields are supported :

- title: Used to create post header links and entries on index pages.
- date : Can be any date format Javascript can parse. Used to chronologically order your posts. You can set to any value you want, this will be the posts' publication date.
- tags: OPTIONAL. Comma-separated list. Used to populate tags page.
- description : OPTIONAL. Appears in the RSS feed and on the archive list.
- menu: OPTIONAL. If set to true, a link to the post will be added to the blog header.
- category: OPTIONAL. If set, post url will follow folder structure the given string.
- mycatnames: a custom data field

##### Custom date fields

You can add anything to the data header, and use it in your Handlebars templates
    
    <p>
        {{mycatnames}}
    </p>

### Categories, permalinks, tags, and keywords

Category is primarily an SEO concept. A post should have one category only, but categories can be nested inside other categories, and should ideally go from less to more specific. To achieve categories with this blog engine, organize your posts into folders, with parent folder corresponding to category names. The folder you place a markdown file in can be the post title. You can then place media associated with that post in the same folder. If you follow this nesting convention and name your markdown file **index.md** the engine will create clean urls for you that omit **index.html**. It is strongly suggested you follow this convention, as it allows your blog to support a large number of posts without cluttering the root directory.

Tags are supported. Use the "tags" value in the post data header.

Keywords is just another name for tags. The keywords meta header is rendered from whichever "tags" you've added to a post data header.
