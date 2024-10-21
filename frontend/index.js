/**
 * Include this in your browser code for search and other functionality to work
*/
import elasticlunr from 'elasticlunr';
import hljs from 'highlight.js/lib/highlight';
import 'highlight.js/styles/atom-one-dark.css';
import javascript from 'highlight.js/lib/languages/javascript';
import dockerfile from 'highlight.js/lib/languages/dockerfile';

// do code highlighting - add additional languages here
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('dockerfile', dockerfile)
hljs.initHighlightingOnLoad()


// load index data in __index.json and pipe this into elasticlunr, the search engine. 
let searchEngine = null
fetch('/__index.json')
    .then((response) => {
        return response.json();
    })
    .then((myJson) => {
        searchEngine = elasticlunr.Index.load(JSON.parse(myJson));
    })

const searchField = document.querySelector('.header-searchField'),
    searchToggle = document.querySelector('.header-menuItemSearch'),
    searchToggleMobile = document.querySelector('.header-menuToggleSearch'),
    searchTrigger = document.querySelector('.header-search'),
    searchResults = document.querySelector('.header-searchResults'),
    searchBar = document.querySelector('.header-searchBar'),
    menuToggle = document.querySelector('.header-menuToggleMenu'),
    header = document.querySelector('.header'),
    body = document.querySelector('body')
 

/**
 * Search can be started by hitting enter on search field, or clicking the search button.
 */
searchField.addEventListener('keydown', function(event){
    if (event.keyCode === 13)
        search()
}, false);

searchTrigger.addEventListener('click', search, false);


/**
 * Performs a search, displays results in top-docked overlay.
 */
function search(){
    if (!searchField.value)
        return

    let results = searchEngine.search(searchField.value,{
        fields: {
            tags: { boost: 3 },
            title: { boost: 2 },
            body: { boost: 1 }
        }
    })  

    searchResults.classList.add('header-searchResults--show')

    let resultsHtml = ''
    if (results.length){
       
        resultsHtml = `Found ${results.length} post(s).`
        for(let result of results){
            let doc = searchEngine.documentStore.getDoc(result.ref)
            resultsHtml += `
                <div class="header-searchResult">
                    <a href="${doc.id}">${doc.title}</a>
                </div>`

        }
    } else{
        resultsHtml = `<div class="header-searchResult">
            No results found for ${searchField.value}
            </div>`
    }

    searchResults.innerHTML = resultsHtml
}


function openSearch(){
    searchBar.classList.add('header-searchBar--visible')
    searchField.focus()
}

function closeSearch(clear = true){
    searchBar.classList.remove('header-searchBar--visible')
    if (clear)
        searchResults.classList.remove('header-searchResults--show')
}

/**
 * Opens or closes the search panel.
 */
function toggleSearch(){
    if (searchBar.classList.contains('header-searchBar--visible'))
        closeSearch()
    else
        openSearch()
}

function openMenu(){
    header.classList.add('header--open')
    body.classList.add('bodyScrollLock')
}

function closeMenu(){
    header.classList.remove('header--open')
    body.classList.remove('bodyScrollLock')
}

/**
 * Opens or closes the mobile menu
 */
function toggleMenu(){
    if (header.classList.contains('header--open'))
        closeMenu()
    else
        openMenu()
}

window.onkeydown = function( event ) {
    // close both search and menu on esc key
    if ( event.keyCode === 27 ) {
        closeSearch()
        closeMenu()
    }
}

document.addEventListener('click', function onClick(e){
    if (e.target === menuToggle || menuToggle.contains(e.target)){
        closeSearch() // always close search when interacting with menu
        toggleMenu()
    }

    if (e.target === searchToggle || searchToggle.contains(e.target) || e.target === searchToggleMobile || searchToggleMobile.contains(e.target)){
        closeMenu() // always close menu when interacting with search
        toggleSearch()
    }

    // search offclick
    let searchInteraction = false
    if (searchBar.contains(e.target))
        searchInteraction = true
    
    if (searchToggle.contains(e.target) || e.target === searchToggle)
        searchInteraction = true

    if (searchToggleMobile.contains(e.target) || e.target === searchToggleMobile)
        searchInteraction = true

    if (!searchInteraction)
        closeSearch(false)

}, false)
