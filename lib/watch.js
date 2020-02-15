/**
 * Creates watches process for running blog in local dev mode. This process will trigger a rebuild of all 
 * static content whenever watched file types are changed on disk.
 */

const 
    fs = require('fs-extra'),
    chokidar = require('chokidar'),
    spawn = require('cross-spawn'),
    process = require('process');
    path = require('path'),
    http = require('http'),
    Express = require('express'),
    app = Express(),
    port = process.env.PORT ? process.env.PORT : 3000;
    
async function handleMarkdownEvent(){
    return new Promise(function(resolve, reject){
        try {
            let child = spawn('npm', ['run', 'build'], { cwd : process.cwd(), env: process.env });
    
            child.stdout.on('data', function (data) {
                console.log(data.toString('utf8'));
            });
                
            child.stderr.on('data', function (data) {
                console.log(data.toString('utf8'));
            });
        
            child.on('error', function (err) {
                return reject(err);
            });
            
            child.on('close', function (code) {
                resolve();
            });

        } catch(ex){
            reject(ex);
        }
    })
}


(async function(){

    let watcher = chokidar.watch(['./frontend/**./*.js', './posts/**/*.*'], {
        persistent: true,
        usePolling: true,
        ignoreInitial : true
    });

    watcher
        .on('add', async function() {
            await handleMarkdownEvent();
        })
        .on('change', async function(){
            await handleMarkdownEvent();
        })
        .on('unlink', async function(){
            await handleMarkdownEvent();
        });

    // force a first build
    handleMarkdownEvent();

    app.use(Express.static('./web'));
    let server = http.createServer(app);
    server.listen(port);

    console.log('Watching...');
})()