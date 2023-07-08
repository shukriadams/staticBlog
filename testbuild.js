(async()=>{

    const blogEngine = require('./index')
    await blogEngine({
        allowHeaderless: true,
        themeFolder : './theme',
        markdownFolder : './example/posts',
        block: ['/blockme/blocked'],
        outFolder : './example/web',
    })

    // serve it
    const express = require('express'),
        server = express()
        
    server.use(express.static('./example/web'))
    server.listen(9000)
})()
