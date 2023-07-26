// ==UserScript==
// @name         SwiperMessageViewer
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Read messages from the swiper and print them on the list on a created window
// @author       KozaCode
// @match        https://beta.character.ai/chat2*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=character.ai
// ==/UserScript==


(function() {
    'use strict';
    function createWindow(){
        const window = document.createElement('div');
        window.style.position = 'fixed';
        window.style.top = '0';
        window.style.right = '0';
        window.style.width = '300px';
        window.style.height = '100%';
        window.style.backgroundColor = 'black';
        window.style.zIndex = '9999'

        const title = document.createElement('h1');
        title.innerText = 'Messages';
        title.style.color = 'white';
        title.style.textAlign = 'center';
        title.style.marginTop = '10px';
        title.style.marginBottom = '10px';
        window.appendChild(title);

        const toggle = document.createElement('button');
        toggle.innerText = '⇅';
        toggle.style.position = 'fixed';
        toggle.style.right = '10px';
        toggle.style.top = '40px';
        toggle.style.backgroundColor = 'transparent';
        toggle.style.border = 'none';
        toggle.style.color = 'white';
        toggle.style.fontSize = '20px';
        toggle.style.cursor = 'pointer';
        toggle.style.outline = 'none';
        toggle.style.zIndex = '10000';
        document.body.appendChild(toggle);


        const list = document.createElement('div');
        list.id = 'message-list';
        list.style.height = 'calc(100% - 100px)';
        list.style.overflowY = 'scroll';
        list.style.padding = '10px';
        list.style.color = 'white';
        list.style.fontSize = '12px';
        list.style.fontFamily = 'monospace';
        list.style.lineHeight = '1.5';
        list.style.textAlign = 'justify';

        list.addEventListener('scroll', () => {
            isScrolledToBottom = list.scrollHeight - list.scrollTop <= list.clientHeight;
        });

        window.appendChild(list);

        toggle.addEventListener('click', () => {
            if(window.style.display === 'none'){
                window.style.display = 'block';

            }else{
                window.style.display = 'none';

            }
        });
        document.body.appendChild(window);
    }


    var messages = {};
    var isScrolledToBottom = true;

    function updateList(){
        const wrapper = document.querySelector('.swiper-wrapper');
        const nodes = wrapper.querySelectorAll('.swiper-slide');
        console.log(nodes.length)
        var active = false
        for(const node of nodes){
            active = false;
            if(node.classList.contains('swiper-slide-active') === true){
                active = true;
            }
            if(node.querySelector('p') === null){
                messages.push({message: " ", active: active});
            }else if(node.querySelector('span.typing-dot') !== null){
                messages.push({message: "...", active: active});
            }else{
                messages.push({message: node.querySelector('p').innerHTML, active: active});
            }
        }
    }
    function displayMessages(){
        console.log("Displaying messages")
        const list = document.getElementById('message-list');
        list.innerHTML = '';
        console.log(messages.length)
        messages.forEach((message) => {
            const item = document.createElement('div');
            item.style.marginBottom = '10px';
            item.style.borderBottom = '1px solid white';
            if(message.message === " "){
                item.innerText = "-";
            }else{
                item.innerHTML = message.message;

            }
            if(message.active){
                item.style.color = 'green';
            }

            list.appendChild(item);
        });
        if(isScrolledToBottom){
            list.scrollTop = list.scrollHeight;
        }
    }

    var added = false;
    var detected = false;
    const observer = new MutationObserver((mutations) => {
        added = false;
        for (const mutation of mutations) {
            if(mutation.type !== 'childList') continue;
            if(mutation.addedNodes.length === 0) continue;
            if(mutation.addedNodes[0].localName !== 'p') continue;
            if(detected === false){
                messages = [];
                detected = true;
            }
            added = true;
            break;
        }
        if(added){
            updateList();
            displayMessages();
            detected = false;
        }

    });
    observer.observe(document.body, { childList: true, subtree: true });
    createWindow();
})();