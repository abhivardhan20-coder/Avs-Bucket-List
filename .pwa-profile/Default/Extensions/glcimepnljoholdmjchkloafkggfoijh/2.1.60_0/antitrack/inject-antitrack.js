"use strict";
chrome.runtime.sendMessage({
    text: Request.on_antitrack_inject,
    url: window.location.host
});