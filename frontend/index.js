import elasticlunr from 'elasticlunr';
import hljs from 'highlight.js/lib/highlight';
import 'highlight.js/styles/atom-one-dark.css';
import javascript from 'highlight.js/lib/languages/javascript';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import debounce from 'debounce';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('dockerfile', dockerfile);

hljs.initHighlightingOnLoad();

let search = null;

fetch('/__index.json')
    .then((response) => {
        return response.json();
    })
    .then((myJson) => {
        search = elasticlunr.Index.load(JSON.parse(myJson));
    });

const seachToggle = document.querySelector('.header-searchToggle'),
    searchField = document.querySelector('.header-searchField'),
    searchTrigger = document.querySelector('.header-search'),
    searchResults = document.querySelector('.header-searchResults'),
    searchBar = document.querySelector('.header-searchBar'); 

seachToggle.addEventListener('click', function(){
    
    if (searchBar.classList.contains('header-searchBar--visible'))
        searchBar.classList.remove('header-searchBar--visible');
    else
        searchBar.classList.add('header-searchBar--visible');
        
}, false);

searchField.addEventListener('keydown', function(event){
    if (event.keyCode === 13)
        doSearch();
}, false);

searchTrigger.addEventListener('click', doSearch, false);

function doSearch(){
    if (!searchField.value)
        return;

    let results = search.search(searchField.value,{
        fields: {
            tags: { boost: 3 },
            title: { boost: 2 },
            body: { boost: 1 }
        }
    });  

    let resultsHtml = '';
    if (results.length){
        resultsHtml = `Found ${results.length} post(s).`;
        for(let result of results){
            let doc = search.documentStore.getDoc(result.ref);
            resultsHtml += `
                <div class="header-searchResult">
                    <a href="${doc.id}">${doc.title}</a>
                </div>`;

        }
    } else{
        resultsHtml = `<div class="header-searchResult">
            No results found for ${searchField.value}
            </div>`;
    }

    searchResults.innerHTML = resultsHtml;
}

/*
window.idx.search('DocKer',{
    fields: {
        tags: {boost: 3},
        title: {boost: 2},
        body: {boost: 1}
    }
});
*/   