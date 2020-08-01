
# Static Blog

Makes a blog out of any markdown files. 

- Store your markdown files in git, organized by folder
- supports static assets like image files
- renders static HTML so you can host on even the simplest web server
- Markup is written in Handlebars, and can be organized as separate, re-useable themes
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
