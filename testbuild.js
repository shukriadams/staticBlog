(async()=>{
    const blogEngine = require('./index')
    await blogEngine({
        templatesFolder : './example/templates',
        markdownFolder : './example/posts',
        outFolder : './example/web',
    })
})()
