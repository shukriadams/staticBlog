title : Javascript Code
date : 2019-03-08
tags : post
description : Inline Javascript styling
---
## Here is some JS

Some code explicitly embedded in pre and code tags, don't do this

<pre><code>
    // some code
    let allPosts = allPosts.sort((a, b)=>{ 
        return a.date > b.date ? -1 :
            a.date < b.date ? 1 :
            0;
    })
</code></pre>

How you should embed code

    // some code
    // some more code
    let allPosts = allPosts.sort((a, b)=>{ 
        return a.date > b.date ? -1 :
            a.date < b.date ? 1 :
            0;
    })

some other text




