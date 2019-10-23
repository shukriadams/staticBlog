const header = document.querySelector('.header'),
    body = document.querySelector('body');

function toggleMenu(){
    if (header.classList.contains('header--open')){
        header.classList.remove('header--open');
        body.classList.remove('bodyScrollLock');
    }
    else{
        header.classList.add('header--open');
        body.classList.add('bodyScrollLock');
    }
}

function onClick(e){
    if (e.target.classList.contains('header-menuToggle'))
        toggleMenu(e);           
}

document.addEventListener('click', onClick, false);