(async()=>{
    const blogEngine = require('./index')
    await blogEngine({
        templatesFolder : './testContent/templates',
        markdownFolder : './testContent/posts',
        outFolder : './testContent/web',
    })
})()
