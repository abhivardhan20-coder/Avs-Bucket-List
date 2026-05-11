"use strict";
chrome.webRequest.onBeforeSendHeaders.addListener(function (e) {
    if(AntiTrack.settings.isEnabled()){   
        consoleLog("onBeforeSendHeaders:" + e.url);   
        var find = false;
        try {
            var matchinit ="";
            var matchurl = "";
            var ismainframe = false;
            if(e.hasOwnProperty('initiator') && e.initiator != undefined ){
                matchinit = AntiTrack.getHostname(e.initiator);
            } 
            if(e.hasOwnProperty('documentUrl')&& e.documentUrl != undefined){
                matchinit = AntiTrack.getHostname(e.documentUrl);
            } 
            if(e.hasOwnProperty('url')&& e.url != undefined){
                matchurl = AntiTrack.getHostname(e.url);
            }          
            if(e.hasOwnProperty('type') && e.type != undefined){
                if(e.type == 'main_frame'){
                    ismainframe = true;
                }
            }
            
            if(ismainframe){
                if(matchinit != "" || matchurl != ""){
                    AntiTrack.exclude_list.forEach(function f(ex, u, a) {
                        if(matchurl.indexOf(ex) != -1){
                            find = true;
                        }
                    });
                }
                AntiTrack.tabstate.UpdateTabState(e.tabId, find); 
            }else{
                find = AntiTrack.tabstate.GetTabState(e.tabId);
            }

        } catch (e) {
            
        }
        if(find == false){
            for (var s = 0, t = e.requestHeaders.length; s < t; ++s)
            if ("User-Agent" === e.requestHeaders[s].name) {
                e.requestHeaders[s].value += AntiTrack.useragent.GetAgent(e.tabId);
                consoleLog("onBeforeSendHeaders User-Agent:" +e.requestHeaders[s].value);      
                break
            }
        return {
            requestHeaders: e.requestHeaders
        }
        }   
};

}, {
    urls: ["<all_urls>"]
}, ["requestHeaders"]);

