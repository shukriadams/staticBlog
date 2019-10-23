
## How to use

- Modify markup in /templates
- Add CSS to /web/css
- Add JS to /web/js or /frontend (for webpack)
- Add blog posts to /posts folder as .md files
- A file's name will become it's url.
- At the top of a file, add a title and date. These are required. 

Optional settings

- You can also add "tags" as a comma-separated list, 
- You can also add "description", which will appear in the RSS feed and on the archive post list.
- For a post to appear in the menu, add "menu:true"

## View locally

    python -m SimpleHTTPServer 3000

## build

    npm install
    npm run build (or node index to build only html)

Output is /web

## Debug

    node --inspect-brk=0.0.0.0:3001 index.js
