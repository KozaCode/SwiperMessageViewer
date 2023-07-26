// ==UserScript==
// @name         Listing content script
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  Read messages from the swiper and print as a list on a created window
// @author       You
// @match        https://beta.character.ai/chat*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=character.ai
// @grant        none
// ==/UserScript==


(function() {
    'use strict';

    let messages = [];
    let isScrolledToBottom = false;
    let added = false;
    let detected = false;
    let activeMessageId = 0

    let style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.innerHTML = `
    #window{
        position: fixed;
        top: 0;
        right: 0;
        width: 300px;
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
    }
    .pointer{
        display: inline-block;
        width: 10px;
        height: 100%;
        margin-right: 10px;
        text-align: center;
    }
    .message{
        display: inline-block;
        width: calc(100% - 20px);
    }
    #left-arrow{
        position: absolute;
        left: 10px;
        bottom: 0;
        background-color: transparent;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        outline: none;
        z-index: 10000;
    }
    #right-arrow{
        position: absolute;
        right: 10px;
        bottom: 0;
        background-color: transparent;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        outline: none;
        z-index: 10000;
    }
    #message-count{
        //center
        margin-left: auto;
        margin-right: auto;
        width: 100%;
        text-align: center;
        color: white;
        font-size: 14px;
        margin-bottom: 10px;
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
                console.log('show');
                window.style.display = 'block';

            }else{
                console.log('hide');
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
        leftArrow.id = 'left-arrow';
        leftArrow.innerText = '←';
        leftArrow.addEventListener('click', () => {
            let button = document.querySelector('.swiper-button-prev');
            button.click();
        });
        window.appendChild(leftArrow);

        const rightArrow = document.createElement('div');
        rightArrow.id = 'right-arrow';
        rightArrow.innerText = '→';
        rightArrow.addEventListener('click', () => {
            let button = document.querySelector('.swiper-button-next');
            button.click();
        });
        window.appendChild(rightArrow);
        document.body.appendChild(window);
    }

    function updateList(){
        const wrapper = document.querySelector('.swiper-wrapper');
        const nodes = wrapper.querySelectorAll('.swiper-slide');
        messages = [];
        let id = 0;
        for(const node of nodes){

            let message = node.querySelector('span.typing-dot') !== null ? '...' : node.querySelectorAll('p') || ' ';

            let active = node.classList.contains('swiper-slide-active');
            console.log({id: id, message: message, active: active})
            messages.push({id: id, message: message, active: active});
            id++;
        }
    }

    function createMessageElements(){
        return messages.map(message => {
            const item = document.createElement('div');
            item.classList.add('item');
            item.dataset.id = message.id;

            item.addEventListener('click', () => {
                isScrolledToBottom = false;
                let id = item.dataset.id;
                let diff = id - activeMessageId;
                console.log("dif = " + diff);
                if(diff > 0){
                    let button = document.querySelector('#right-arrow');
                    for(let i = 0; i < diff; i++){
                        setTimeout(() => {
                            button.click();
                        }, 250);
                    }
                }else if(diff < 0){
                    let button = document.querySelector('#left-arrow');
                    for(let i = diff; i<0; i++){
                        setTimeout(() => {
                            button.click();
                        }, 250);
                    }
                }
            });

            const pointer = document.createElement('div');
            pointer.classList.add('pointer');
            pointer.innerHTML = message.active ? '→' : ' ';
            item.appendChild(pointer);

            const messageElement = document.createElement('div');
            messageElement.classList.add('message');
            console.log("Message length = " + message.message.length)
            console.log("Message type = " + typeof message.message)
            if(typeof message.message == 'object'){
                message.message.forEach((node) => {
                    messageElement.innerHTML += node.innerHTML + '</br></br>';
                });
                messageElement.style.color = message.active ? 'green' : 'white';
            }else{
                messageElement.innerHTML = message.message === " " ? "-" : message.message;
                messageElement.style.color = message.active ? 'green' : 'white';
            }
            if(message.active){
                activeMessageId = message.id;
            }
            item.appendChild(messageElement);



            return item;
        });
    }

    function displayMessages(){
        const list = document.getElementById('list');
        list.innerHTML = '';
        const messages = createMessageElements();
        messages.forEach((message) => list.appendChild(message));
        const messageCount = document.getElementById('message-count');
        messageCount.innerText = messages.length;

        if(isScrolledToBottom){
            list.scrollTop = list.scrollHeight;
        }
    }

    const observer = new MutationObserver((mutations) => {
        added = false;
        for (const mutation of mutations) {
            if(mutation.type === 'childList' && mutation.addedNodes.length > 0 && mutation.addedNodes[0].localName === 'p'){
                added = true;
                break;
            }
        }
        if(added){
            observer.disconnect();
            updateList();
            displayMessages();
            observer.observe(document.body, { childList: true, subtree: true });
        }

    });

    observer.observe(document.body, { childList: true, subtree: true });
    createWindow();
})();