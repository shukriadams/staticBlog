
# Static Blog

A tiny blog engine. 

- renders static HTML
- Posts are written in markdown
- Markup is written in Handlebars.

## How to use

- Set site name and other general features in ./settings.env
- Modify markup in /templates
- Add CSS to /web/css
- Add JS to /web/js or /frontend (for webpack)
- Add blog posts to /posts folder as .md files
- A post file's name will become its url.
- Add a title and date to the YML section at the top of a post file - these two values are required to publish.

Optional settings

- You can also add "tags" as a comma-separated list, 
- You can also add "description", which will appear in the RSS feed and on the archive post list.
- For a post to appear in the menu, add "menu:true"

## Requirements

- NodeJS 8 or higher

## Setup

    npm install -g yarn
    npm install -g webpack
    npm install -g webpack-cli
    npm install

## Build

To build html and /frontend run

    npm run build 

To build only html
    
    node index

Output is /web

## View locally

    cd /web
    python -m SimpleHTTPServer 3000

Use any web serving tool you want, I've used Python 2.x above because of its ubiquity.
