// ==UserScript==
// @name         CloseAlerts
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       KozaCode
// @match        https://beta.character.ai/chat2?*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=character.ai
// ==/UserScript==

(function() {
    'use strict';
    const mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach((node) => {
                    if (node.classList.contains('Toastify__toast-container')) {
                        node.querySelectorAll('button').forEach((button) => {
                            node.remove();
                        });
                    }
                });
            }
        });
    });
    mutationObserver.observe(document.body, {childList: true, subtree: true});
})();