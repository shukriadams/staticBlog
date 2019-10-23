import hljs from 'highlight.js/lib/highlight';
import 'highlight.js/styles/atom-one-dark.css';
import javascript from 'highlight.js/lib/languages/javascript';
import dockerfile from 'highlight.js/lib/languages/dockerfile';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('dockerfile', dockerfile);

hljs.initHighlightingOnLoad();
