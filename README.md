
# Static Blog

A tiny blog engine. 

- renders static HTML
- Posts are written in markdown
- Markup is written in Handlebars.
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

    npm install -g yarn
    npm install -g webpack
    npm install -g webpack-cli
    npm install

## Build

Run

    npm run build 

output is /web. View it locally with

    cd /web
    python -m SimpleHTTPServer 3000

You can use any web serving tool you want, I've listed Python 2.x here because of its ubiquity.

## Post structure

- A post file's name will become its url.

### Post data headers

Posts have the following YML-like header consists of name:value lines, terminated with at least three dashes (---)
   
    title: 10 reasons cats exist, you won't believe 11
    date: 2000-12-25
    tags: cats, pets, mammals, existentialist horror
    description: An in-depth analysis into whether cats exist, or do we?
    menu: true
    mycatnames: Cathulu, Innsmeouth, Mountains of Meowdness
    ---
    ## Are cats our cosmic overlords?

    Here is some fascinating markdown about cats
    

- title: required field. Used to create post header links and entries on index pages.
- date : required field. Can be any date format Javascript can parse. Used to chronologically order your posts. You can set to any value you want, this will be the posts' publication date.
- tags: comma-separated list. Used to populate categories page.
- description : appears in the RSS feed and on the archive list.
- menu: if set to true, a link to the post will be added to the blog header.

##### Custom date fields

You can add anything to the data header, and use it in your Handlebars templates
    
    <p>
        {{mycatnames}}
    </p>
  

