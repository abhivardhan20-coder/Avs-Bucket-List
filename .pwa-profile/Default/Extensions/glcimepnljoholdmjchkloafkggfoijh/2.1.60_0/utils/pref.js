var Prop = {
    "enable_toast" : "enable_toast",
    "enable_toolbar": "enable_toolbar",
    "agree_to_privacy_policy": "agree_to_privacy_policy",
    "hide_settings" : "hide_settings",
    "next_dau_time" : "next_dau_time"

}

function setPref(key, value) {
    // localStorage[key] = value;

    var obj = {};
    obj[key] = value;
    chrome.storage.local.set(obj, function() {
        consoleLog("setPref(" + key + ") = value:" + value);
    });
}

function getPref(key, defaultValue, callback) {
    // return localStorage[key];
    chrome.storage.local.get(key,
        function(items) {
            if (items != undefined && items[key] != undefined) {
                callback(items[key]);
                consoleLog("getPref(" + key + ") = value:" + items[key]);
            } else {
                callback(defaultValue);
                consoleLog("getPref(" + key + ") = default value:"
                        + defaultValue);
            }
        });
}

function getGlobalValue(key) {
    return localStorage[key];
}

function setGlobalValue(key, value) {
    localStorage[key] = value;
}
