// ==UserScript==
// @name         Listing content script
// @namespace    http://tampermonkey.net/
// @version      0.9
// @description  Read messages from the swiper and print as a list on a created window + Auto swiping by clicking on the message in the list + Search bar + Exclude bar + Favorite messages
// @author       KozaCode
// @match        https://beta.character.ai/chat*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=character.ai
// @grant        none
// ==/UserScript==


(function() {
    'use strict';
    var contentLoop;
    var activeMessageLoop;
    var currentID = 0;
    var window;
    var messageCount;
    var list;
    var swiper;
    var searchBar;
    var excludeBar;
    var lockToBottom = false; 
    var messagesText = [];
    var messagesHTML = [];
    var toggleLockToBottomButton;
    var clickDelay = 1;
    var favoriteMessageHashes = [];
    var clickingInProgress = false;
    var searchBarTimeout;
    var excludeBarTimeout;
    var searchSentence = "";
    var excludeSentence = "";

    function hashCode(s){
        var h = 0, l = s.length, i = 0;
        if ( l > 0 )
            while (i < l)
                h = (h << 5) - h + s.charCodeAt(i++) | 0;
        return h;
    }

    let style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.innerHTML = `
    #window{
        position: fixed;
        flex-direction: column;
        top: 0;
        right: 0;
        width: 450px;
        height: 100%;
        background-color: black;
        z-index: 9999;
    }
    #window-container{
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
    }
    #window h1{
        color: white;
        text-align: center;
        margin-top: 10px;
        margin-bottom: 10px;
    }

    #toggle{
        position: fixed;
        right: 10px;
        top: 40px;
        background-color: transparent;
        border: none;
        color: white;
        font-size: 30px;
        cursor: pointer;
        outline: none;
        z-index: 10000;
    }
    #list{
        flex-grow: 1;
        overflow-y: scroll;
        padding: 10px;
        color: white;
        font-size: 12px;
        font-family: monospace;
        line-height: 1.5;
        text-align: justify;
    }
    #list::-webkit-scrollbar {
        width: 10px;
    }
    #list::-webkit-scrollbar-track {
        background: #f1f1f1;
    }
    #list::-webkit-scrollbar-thumb {
        background: #888;
    }
    #list::-webkit-scrollbar-thumb:hover {
        background: #555;
    }

    .item{
        margin-bottom: 10px;
        border-bottom: 1px solid white;
        display: flex;
        flex-direction: row;
        align-items: stretch;

    }



    .active .pointer{
        visibility: visible;
    }
    .inactive .pointer{
        visibility: hidden;
    }
    .active .message{
        color: #2ba12b;
    }
    .inactive .message{
        color: white;
    }
    .active.item{
        border-left: 1px solid #2ba12b;
        border-bottom: 1px solid #2ba12b;
    }
    .inactive.item{
        border-left: 1px solid white;
        border-bottom: 1px solid white;
    }
    .active .left-side{
        border-top: 1px solid #2ba12b;
        border-right: 1px solid #2ba12b;
    }
    .inactive .left-side{
        border-top: 1px solid white;
        border-right: 1px solid white;
    }


    .pointer{
        width: 20px;
        height: 20px;
        text-align: center;
        margin-left: auto;
        margin-right: auto;
        font-size: 20px;
        line-height: 20px;
        user-select: none;
    }

    .message{
        display: inline-block;
        width: calc(100% - 20px);
    }


    #bottom-bar{
        display: flex;
        flex-direction: row;
        width: 100%;
        height: 50px;
        background-color: black;
        justify-content: space-between;
    }
    .arrow{
        margin: 0 10px 0 10px;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        user-select: none;
        cursor: pointer;
        font-size: 30px;
    }
    #left-arrow{
        left: 10px;
    }
    #right-arrow{
        right: 10px;
    }
    #message-count{
        margin-left: auto;
        margin-right: auto;
        width: 100%;
        text-align: center;
        color: white;
        font-size: 14px;
        margin-bottom: 10px;
    }
    .left-side{
        display: flex;
        width: 30px;
        height: 100%;
        margin-right: 10px;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        border-right: 1px solid white;
        border-top: 1px solid white;
    }

    .id{
        width: 20px;
        height: 20px;
        text-align: center;
        font-size: 15px;
        color: white;
        cursor: pointer;
        user-select: none;
    }
    #text-bar{
        display: block;
        width: calc(100% - 20px);
        height: 30px;
        min-height: 30px;
        margin-bottom: 10px;
        margin-left: auto;
        margin-right: auto;
        font-size: 15px;
        border: 1px solid white;
        background: transparent;
        outline: none;
    }
    #text-bar:focus{
        border: 2px solid white;
    }
    .search-result{
        border: 1px solid red;
    }
    .action{
        color: #949494 !important;
    }
    `;


    document.getElementsByTagName('head')[0].appendChild(style);

    function loadFavoriteMessageHashes(){
        let temp = localStorage.getItem('favoriteMessageHashes');
        if(temp){
            favoriteMessageHashes = JSON.parse(temp);
            console.log('Loaded favorite Message Hashes: ', favoriteMessageHashes);
        }
    };
    loadFavoriteMessageHashes();

    function changeSearchSentence(sentence){
        clearTimeout(searchBarTimeout);
        searchBarTimeout = setTimeout(() => {
            searchSentence = sentence.toLowerCase();
            searchBar.style.borderColor = "green";
            rebuildList();
        }, 600);
    }

    function changeExcludeSentence(sentence){
        clearTimeout(excludeBarTimeout);
        excludeBarTimeout = setTimeout(() => {
            excludeSentence = sentence.toLowerCase();
            excludeBar.style.borderColor = "green";
            rebuildList();
        }, 600);
    }

    function createWindow(){
        const window = document.createElement('div');
        window.style.display = 'none';
        window.id = 'window';

        const windowContainer = document.createElement('div');
        windowContainer.id = 'window-container';
        window.appendChild(windowContainer);


        const title = document.createElement('h1');
        title.innerText = 'Messages';
        windowContainer.appendChild(title);

        messageCount = document.createElement('div');
        messageCount.id = 'message-count';
        messageCount.innerText = '0';
        windowContainer.appendChild(messageCount);

        searchBar = document.createElement('textarea');
        searchBar.id = 'text-bar';
        searchBar.placeholder = 'Search';
        searchBar.addEventListener('input', () => {
            searchBar.style.borderColor = "grey";
            changeSearchSentence(searchBar.value);
        });
        windowContainer.appendChild(searchBar);

        excludeBar = document.createElement('textarea');
        excludeBar.id = 'text-bar';
        excludeBar.placeholder = 'Exclude';
        excludeBar.addEventListener('input', () => {
            excludeBar.style.borderColor = "grey";
            changeExcludeSentence(excludeBar.value);
        });
        windowContainer.appendChild(excludeBar);



        searchBar.addEventListener('input', () =>{
            searchBar.style.borderColor = "grey";
            changeSearchSentence(searchBar.value);
        });

        const toggle = document.createElement('button');
        toggle.id = 'toggle';
        toggle.innerText = '⇅';
        toggle.addEventListener('click', () => {
            if(window.style.display === 'none'){
                window.style.display = 'block';
            }else{
                window.style.display = 'none';
            }
        });
        document.body.appendChild(toggle);

        list = document.createElement('div');
        list.id = 'list';

        list.addEventListener('scroll', () => {
            lockToBottom = list.scrollHeight - list.offsetHeight - list.scrollTop < 1
            console.log("Reached bottom: " + lockToBottom)
            if(lockToBottom){
                toggleLockToBottomButton.style.color = 'green';
            }else{
                toggleLockToBottomButton.style.color = 'red';
            }

        });
        windowContainer.appendChild(list);

        const bottomBar = document.createElement('div');
        bottomBar.id = 'bottom-bar';
        windowContainer.appendChild(bottomBar);

        const leftArrowContainer = document.createElement('div');
        leftArrowContainer.classList.add('arrow');
        leftArrowContainer.id = 'left-arrow';
        leftArrowContainer.innerText = '←';
        leftArrowContainer.addEventListener('click', () => {
            let button = document.querySelector('.swiper-button-prev');
            button.click();
        });
        bottomBar.appendChild(leftArrowContainer);

        toggleLockToBottomButton = document.createElement('div');
        toggleLockToBottomButton.classList.add('arrow');
        toggleLockToBottomButton.id = 'lock-to-the-bottom';
        toggleLockToBottomButton.innerText = '⇓';
        toggleLockToBottomButton.style.color = lockToBottom ? 'green' : 'red'; 
        toggleLockToBottomButton.addEventListener('click', () => {
            if(!lockToBottom){
                toggleLockToBottomButton.style.color = 'green';
                lockToBottom = true;
                list.scrollTop = list.scrollHeight;
            }else{
                toggleLockToBottomButton.style.color = 'red';
                lockToBottom = false;
            }
        });
        bottomBar.appendChild(toggleLockToBottomButton);

        const rightArrowContainer = document.createElement('div');
        rightArrowContainer.classList.add('arrow');
        rightArrowContainer.id = 'right-arrow';
        rightArrowContainer.innerText = '→';
        rightArrowContainer.addEventListener('click', () => {
            let button = document.querySelector('.swiper-button-next');
            button.click();
        });
        bottomBar.appendChild(rightArrowContainer);
        document.body.appendChild(window);
    }

    function convertMessages(readMessages){
        let convertedMessages = [];
        readMessages.forEach((message) => {
            let text = message.querySelector('span.typing-dot') !== null ? '...' : message.querySelectorAll('p') || '-';
            if(typeof text == 'object'){
                let temp = "";
                text.forEach((node) => {
                    temp += node.innerHTML + "</br></br>";
                });
                text = temp;
            }
            convertedMessages.push(text);
        });
        return convertedMessages;
    }


    function areMessagesSame(){
        // console.log('Checking content');
        let localMessages = convertMessages(swiper.querySelectorAll('.swiper-slide'));
        if(localMessages.length === 0 && messagesText.length === 0){
            // console.log('Both are empty so they are the same');
            return true;
        }
        if(localMessages.length === 0 ^ messagesText.length === 0){
            // console.log('One of them is empty');
            return false;
        }
        //Compare localMessages with messagesText
        if(localMessages.length === messagesText.length){
            // console.log('Same length so we can check content');
            for(let i = 0; i < localMessages.length; i++){
                if(localMessages[i] !== messagesText[i]){
                    // console.log('Loop found difference');
                    return false;
                }
            }
            return true;
        }
    }

    function constructMessageHTML(message, i){
        let hash = hashCode(message);

        const messageHTML = document.createElement('div');
        messageHTML.classList.add('item');
        messageHTML.classList.add('inactive');
        messageHTML.dataset.id = i;

        const leftSide = document.createElement('div');
        leftSide.classList.add('left-side');
        messageHTML.appendChild(leftSide);

        const pointer = document.createElement('div');
        pointer.classList.add('pointer');
        pointer.innerText = '→';
        leftSide.appendChild(pointer);
        
        const id = document.createElement('div');
        id.classList.add('id');
        id.innerText = i;
        id.dataset.id = i;
        id.style.color = favoriteMessageHashes.includes(hash) ? 'gold' : 'white';
        id.style.backgroundColor = favoriteMessageHashes.includes(hash) ? '#333333' : 'transparent';
        id.addEventListener('click', () => {
            if(id.style.color === 'gold'){
                //Remove every matching id from favoriteMessageHashes
                
                favoriteMessageHashes = favoriteMessageHashes.filter((h) => h !== hash);
                id.style.color = 'white';
                id.style.backgroundColor = 'transparent';
            }else{
                favoriteMessageHashes.push(hash)
                id.style.color = 'gold';
                id.style.backgroundColor = '#333333'
            }
            console.log('Favorite Message Hashes: ', favoriteMessageHashes);
            localStorage.setItem('favoriteMessageHashes', JSON.stringify(favoriteMessageHashes));
        });
        leftSide.appendChild(id);

        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        console.log("Before creating message: ", message);
        messageElement.innerHTML = message;

        messageElement.dataset.hash = hash;

        messageElement.addEventListener('click', () => {
            if(clickingInProgress){
                return;
            }
            lockToBottom = false;
            let idNumber = messageHTML.dataset.id;
            let difference = idNumber - currentID;
            console.log('Difference: ' + difference);
            console.log('From message: ', currentID, "To: ", idNumber);
            if(difference > 0){
                let button = document.querySelector('.swiper-button-next');
                clickingInProgress = true;
                for(let i = 0; i < difference; i++){
                    setTimeout(() => {
                        button.click();
                        if(i === difference-1){
                            clickingInProgress = false;
                        }
                    }, clickDelay * (i+1));

                }
            }else if(difference < 0){
                let button = document.querySelector('.swiper-button-prev');
                clickingInProgress = true;
                difference = Math.abs(difference);
                for(let i = 0; i < difference; i++){
                    setTimeout(() => {
                        button.click();
                        if(i === difference-1){
                            clickingInProgress = false;
                        }
                    }, clickDelay * (i+1));
                }
            }
        });

        messageHTML.appendChild(messageElement);
        return messageHTML;
    }

    function anyStringInArrayIsInString(arr, largerString) {
        return arr.some(str => largerString.toLowerCase().includes(str));
    }

    function rebuildList(){
        console.log('----------------Rebuilding list----------------');
        let localMessages = swiper.querySelectorAll('.swiper-slide');
        let localMessagesText = [];
        
        messagesText = [];
        messagesHTML = [];

        localMessagesText = convertMessages(localMessages);
        messagesText = [...localMessagesText];

        //When we have the messages we can build HTML element for each message that will be added to the list using our style
        //If we rebuild the list we need to clear it first so we won't have duplicates
        list.innerHTML = '';
        let i = 0;
        localMessagesText.forEach((message) => {
            i++;

            const emRegex = new RegExp("<em>", 'gi');
            message = message.replace(emRegex, "<em class='action'>");
            if(searchSentence !== ""){
                const words = searchSentence.split(';');
                let includes = false;
                words.forEach((word) => {
                    if(word === ""){return;}
                    const searchWord = new RegExp(`(?![^<]*>)${word}`, 'gi');
                    message = message.replace(searchWord, "<em class='search-result'>$&</em>");
                    if(message.includes(`<em class='search-result'>`)){
                        includes = true;
                    }
                });
                if(!includes){
                    return;
                }
            };
            if(excludeSentence !== ""){
                const words = excludeSentence.split(';');
                if(anyStringInArrayIsInString(words, message)){
                    return;
                }
            }


            const createdMessage = constructMessageHTML(message, i);
            messagesHTML.push(createdMessage);
            list.appendChild(createdMessage);
        });

    }

    //Every x seconds check content of the swipper if it changed
    function checkSwiper(){
        if(!swiper || !swiper.isSameNode(document.querySelector('.swiper-wrapper'))){
            swiper = document.querySelector('.swiper-wrapper');
            if(!swiper){
                // console.log('Swiper not found');
                return;
            }
        }
        
        if(swiper.childElementCount !== messagesText.length){ //I need if it works
            console.log('Swiper has different number of messages than messagesText so we need to rebuild the list', swiper.childElementCount, messagesText.length);
            rebuildList();
        }else{
            // console.log('Same number of messages but content may be different');
            if(areMessagesSame()){ //If they are the same we do not have to update the messages
                // console.log('Messages are the same');
                return;
            }else{
                // console.log('Messages are different');
                rebuildList();
            }
        }
    }

    function checkActiveMessage(){
        if(!swiper){
            swiper = document.querySelector('.swiper-wrapper');
            if(!swiper){
                // console.log('Swiper not found');
                return;
            }
        }
        let activeMessage = swiper.querySelectorAll('.swiper-slide');
        
        let id = Array.from(activeMessage).findIndex(message => message.classList.contains('swiper-slide-active'))+1;
        currentID = id;
        messageCount.innerText = currentID + '/' + messagesText.length;
        messagesHTML.forEach(message => {
            if(message.dataset.id == id){
                message.classList.remove('inactive');
                message.classList.add('active');
            }else{
                message.classList.remove('active');
                message.classList.add('inactive');
            }
        });
    }
    // console.log("Script loaded");
    createWindow();

    contentLoop = setInterval(function() {
        checkSwiper();
    }, 1000);

    activeMessageLoop = setInterval(function() {
        checkActiveMessage();
    }, 400);

})();