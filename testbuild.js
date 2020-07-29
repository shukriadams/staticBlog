(async()=>{
    const blogEngine = require('./index')
    await blogEngine({
        themeFolder : './theme',
        markdownFolder : './example/posts',
        outFolder : './example/web',
    })
})()
