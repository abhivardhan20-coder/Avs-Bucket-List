"use strict";

var wdHelper = {
    support : false,
    web_list : [],
    web_script : "",
    webSupport :function(url){
        var bSupport = false;
        if (wdHelper.support != false)
        {
            try {
                wdHelper.web_list.forEach(function f(e, u, a) {
                    if (url.indexOf(e) != -1) {
                        bSupport = true;
                        throw Error();  
                    }
                });
            } catch (error) {
            }
        }
        return bSupport;
    },
    webInit: function(webList,webScript){
        if(typeof webList == "object" && typeof webScript == "string"){
            wdHelper.support = true;
            wdHelper.web_list = webList;
            wdHelper.web_script = webScript;
        }
    }
}