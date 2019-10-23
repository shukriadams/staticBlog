
## How to use

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

## Setup

    npm install

## Build

    npm run build (or node index to build only html)

Output is /web

## View locally

    cd /web
    python -m SimpleHTTPServer 3000

Use any web serving tool you want, I've used python above because of its ubiquity.

## Debug

    node --inspect-brk=0.0.0.0:3001 index.js
