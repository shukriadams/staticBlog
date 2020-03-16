
# Static Blog

A tiny blog engine. 

- renders static HTML
- Posts are written in markdown
- Markup is written in Handlebars.
- Clientside search through all post text
- RSS feed

## How to use

- Set site name and other general features in /settings.env
- Modify markup in /templates
- Add CSS to /web/static/css
- Add JS to /web/static/js or /frontend (for webpack)
- Add blog posts to /posts folder as .md files

## Requirements

- NodeJS 8 or higher

## Setup

    npm install -g webpack
    npm install -g webpack-cli
    npm install

## Watch

Run

    npm start

to live-build all changes to /frontend and /posts. Content is served at

    http://localhost:3000

If you want to serve the content with another webserver (say Python)

    cd /web
    python -m SimpleHTTPServer 3000

## Build only

To build all blog posts (such as in your CI/CD system) run

    npm run build 

output is /web. 

## Post structure

- A post file's name will become its url.

### Post data headers

Each post file has a YML-like data header. This header consists of name:value lines, and is terminated with at least three dashes.
   
    title: 10 reasons cats exist, you won't believe 11
    date: 2000-12-25
    tags: cats, pets, mammals, existentialist horror
    description: An in-depth analysis into whether cats exist, or do we?
    menu: true
    mycatnames: Cathulu, Innsmeouth, Mountains of Meowdness
    category: philosophy/existentialist/horror
    ---
    ## Are cats our cosmic overlords?

    Here is some fascinating markdown about cats

The following fields are supported :

- title: Used to create post header links and entries on index pages.
- date : Can be any date format Javascript can parse. Used to chronologically order your posts. You can set to any value you want, this will be the posts' publication date.
- tags: OPTIONAL. Comma-separated list. Used to populate tags page.
- description : OPTIONAL. Appears in the RSS feed and on the archive list.
- menu: OPTIONAL. If set to true, a link to the post will be added to the blog header.
- category: OPTIONAL. If set, post url will follow folder structure the given string.

##### Custom date fields

You can add anything to the data header, and use it in your Handlebars templates
    
    <p>
        {{mycatnames}}
    </p>

### Categories, permalinks, tags, and keywords

Category is primarily an SEO concept. A post should have one category only, but categories can be nested inside other categories, and should ideally go from less to more specific. To achieve categories with this blog engine, organize your posts into folders, with parent folder corresponding to category names. The folder you place a markdown file in can be the post title. You can then place media associated with that post in the same folder. If you follow this nesting convention and name your markdown file **index.md** the engine will create clean urls for you that omit **index.html**. It is strongly suggested you follow this convention, as it allows your blog to support a large number of posts without cluttering the root directory.

Tags are supported. Use the "tags" value in the post data header.

Keywords is just another name for tags. The keywords meta header is rendered from whichever "tags" you've added to a post data header.
