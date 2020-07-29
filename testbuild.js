(async()=>{
    const blogEngine = require('./index')
    await blogEngine({
        allowHeaderless: true,
        themeFolder : './theme',
        markdownFolder : './example/posts',
        outFolder : './example/web',
    })
})()
