"use strict";

chrome.runtime.sendMessage({
    text: Request.on_wd_helper_inject,
    url: window.location.host,
},function(e) {
    if(e === 0) return;
    window.addEventListener("message", function(event)
    {   
        
        if (event.data.type && (event.data.type == "wd_extension")) {
            chrome.runtime.sendMessage({
                text: Request.on_wd_helper_support,
                func: event.data.func,
                parameter: event.data.parameter,
                sid : event.data.requestId,
            });
        }
    },false);

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if(request.text == Request.on_wd_helper_support)
        {
            window.postMessage({
                type: 'wd_extension_recv',
                requestId : request.sid,
                ret: request.ret,
                err: request.err,
            }, '*');
        }
    })
});


