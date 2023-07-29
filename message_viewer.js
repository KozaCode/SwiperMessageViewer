// ==UserScript==
// @name         Listing content script
// @namespace    http://tampermonkey.net/
// @version      0.5
// @description  Read messages from the swiper and print as a list on a created window
// @author       KozaCode
// @match        https://beta.character.ai/chat*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=character.ai
// @grant        none
// ==/UserScript==


(function() {
    'use strict';
    let useObserver = false;
    let messages = [];
    let messageElements = [];
    let isScrolledToBottom = false;
    let mutated = false;
    let detected = false;
    let activeMessageId;
    let intervalOfAutoScroll = 200; //ms
    let wrapper;
    let wrapperChecker;
    let style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.innerHTML = `
    #window{
        position: fixed;
        top: 0;
        right: 0;
        width: 450px;
        height: 100%;
        background-color: black;
        z-index: 9999;
    }
    #window h1{
        color: white;
        text-align: center;
        margin-top: 10px;
        margin-bottom: 10px;
    }
    #window button{
        position: fixed;
        right: 10px;
        top: 40px;
        background-color: transparent;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        outline: none;
        z-index: 10000;
    }
    #toggle{
        position: fixed;
        right: 10px;
        top: 40px;
        background-color: transparent;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        outline: none;
        z-index: 10000;
    }
    #list{
        height: calc(100% - 140px);
        overflow-y: scroll;
        padding: 10px;
        color: white;
        font-size: 12px;
        font-family: monospace;
        line-height: 1.5;
        text-align: justify;
        
    }
    .item{
        margin-bottom: 10px;
        border-bottom: 1px solid white;
        display: flex;
        flex-direction: row;
        align-items: stretch;
        border-left: 1px solid white;
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

    .arrow{
        position: absolute;
        bottom: 0;
        background-color: transparent;
        border: none;
        color: white;
        font-size: 40px;
        cursor: pointer;
        outline: none;
        z-index: 10000;
        user-select: none;
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
    `;
    document.getElementsByTagName('head')[0].appendChild(style);


    function createWindow(){
        const window = document.createElement('div');
        window.style.display = 'none';
        window.id = 'window';

        const title = document.createElement('h1');
        title.innerText = 'Messages';
        window.appendChild(title);

        const messageCount = document.createElement('div');
        messageCount.id = 'message-count';
        messageCount.innerText = '0';
        window.appendChild(messageCount);


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

        const list = document.createElement('div');
        list.id = 'list';

        list.addEventListener('scroll', () => {
            isScrolledToBottom = list.scrollHeight - list.scrollTop <= list.clientHeight;
        });
        window.appendChild(list);

        const leftArrow = document.createElement('div');
        leftArrow.classList.add('arrow');
        leftArrow.id = 'left-arrow';
        leftArrow.innerText = '←';
        leftArrow.addEventListener('click', () => {
            let button = document.querySelector('.swiper-button-prev');
            button.click();
        });
        window.appendChild(leftArrow);

        const rightArrow = document.createElement('div');
        rightArrow.classList.add('arrow');
        rightArrow.id = 'right-arrow';
        rightArrow.innerText = '→';
        rightArrow.addEventListener('click', () => {
            let button = document.querySelector('.swiper-button-next');
            button.click();
        });
        window.appendChild(rightArrow);
        document.body.appendChild(window);
    }

    function checkAndUpdateMessages(){
        const wrapper = document.querySelector('.swiper-wrapper');
        const nodes = wrapper.querySelectorAll('.swiper-slide');
        let tempMessages = [];
        let different = false;
        let id = 1;

        for(const node of nodes){
            let message = node.querySelector('span.typing-dot') !== null ? '...' : node.querySelectorAll('p') || '-';
            if(typeof message == 'object'){
                let temp = "";
                message.forEach((node) => {
                    temp += node.innerHTML + "</br></br>";
                });
                message = temp;
            }
            if(!different){
                if(!messages[id]){
                    different = true;
                }else if(messages[id].message !== message){
                    different = true;
                }
            }
            let active = node.classList.contains('swiper-slide-active');
            if(active && activeMessageId){
                //clear active
                let activeMessage = messageElements[activeMessageId-1];
                activeMessage.querySelector('.pointer').innerHTML = ' ';
                activeMessage.querySelector('.message').style.color = 'white';
                activeMessageId = id;
            }
            tempMessages.push({id: id, message: message, active: active});
            id++;
        }
        if(different){
            messages = tempMessages;
        }
        return different;
    }

    function createMessageElements(){
        return messages.map(message => {
            const item = document.createElement('div');
            item.classList.add('item');
            item.dataset.id = message.id;

            const leftSide = document.createElement('div');
            leftSide.classList.add('left-side');
            item.appendChild(leftSide);

            const pointer = document.createElement('div');
            pointer.classList.add('pointer');
            pointer.innerHTML = message.active ? '→' : ' ';
            leftSide.appendChild(pointer);

            const idElement = document.createElement('div');
            idElement.classList.add('id');
            idElement.innerHTML = message.id;
            idElement.style.color = 'white';
            idElement.addEventListener('click', () => {
                if(idElement.style.color === 'gold'){
                    idElement.style.color = 'white';
                    idElement.style.backgroundColor = 'transparent';

                }else{
                    idElement.style.color = 'gold';
                    idElement.style.backgroundColor = '#333333'
                }
            });
            leftSide.appendChild(idElement);

            const messageElement = document.createElement('div');
            messageElement.classList.add('message');
            messageElement.innerHTML = message.message;
            messageElement.style.color = message.active ? 'green' : 'white';
            if(message.active){
                activeMessageId = message.id;
            }
            messageElement.addEventListener('click', () => {
                isScrolledToBottom = false;
                let id = item.dataset.id;
                let diff = id - activeMessageId;
                if(diff > 0){
                    let button = document.querySelector('#right-arrow');
                    for(let i = 0; i < diff; i++){
                        setTimeout(() => {
                            button.click();
                        }, intervalOfAutoScroll * (i+1));
                    }
                }else if(diff < 0){
                    let button = document.querySelector('#left-arrow');
                    for(let i = 0; i < Math.abs(diff); i++){
                        setTimeout(() => {
                            button.click();
                        }, intervalOfAutoScroll * (i+1));
                    }
                }
            });
            item.appendChild(messageElement);
            return item;
        });
    }

    function displayMessages(recreate = false){
        const list = document.getElementById('list');
        list.innerHTML = '';
        messageElements = recreate ? createMessageElements() : messageElements;
        for(const message of messageElements){
            list.appendChild(message);
        }
        const messageCount = document.getElementById('message-count');
        messageCount.innerText = activeMessageId + "/" + messageElements.length;

        if(isScrolledToBottom){
            list.scrollTop = list.scrollHeight;
        }
    }
    if(useObserver){
        //Observer does not work properly on mobile devices so it is disabled by default and the interval is used instead
        const observer = new MutationObserver((mutations) => {
            mutated = false;
            for (const mutation of mutations) {
                if(mutation.type === 'childList' && mutation.addedNodes.length > 0 && mutation.addedNodes[0].localName === 'p'){
                    mutated = true;
                    break;
                }else if(mutation.type === 'attributes' && mutation.attributeName === 'style' && mutation.target.classList.contains('swiper-slide-active')){
                    mutated = true;
                    break;
                }
            }
            if(mutated){
                
                observer.disconnect();
                if(checkAndUpdateMessages()){
                    displayMessages(true);
                }else{
                    displayMessages(false);
                }
                wrapper = document.getElementsByClassName('swiper-wrapper')[0];
                observer.observe(document.getElementsByClassName('swiper-wrapper')[0], { childList: true, subtree: true, attributes: true});
            }

        });
        wrapperChecker = setInterval(() => {
            if(wrapper === undefined){
                observer.disconnect();
                wrapper = document.getElementsByClassName('swiper-wrapper')[0];
                observer.observe(wrapper ? wrapper : document.body, { childList: true, subtree: true, attributes: true});
            }
        }, 1000);
        observer.observe(document.body, { childList: true, subtree: true, attributes: true});

    }else{
        setInterval(() => {
            checkAndUpdateMessages();
            displayMessages(true);
        }, 700);
    }


    createWindow();
})();