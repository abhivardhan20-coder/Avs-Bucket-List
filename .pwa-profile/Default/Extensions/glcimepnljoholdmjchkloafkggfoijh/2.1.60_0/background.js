// manifest.json V3中 service_worker 不能使用background.html 这里把所有js集中到这里

// 公共方法
// 兼容 setTimeout
async function startAlarm(name, duration , type = 'timeout') {
    if (type == 'timeout') {
        // when 可以是毫秒值
        await chrome.alarms.create(name, { when: Date.now() + duration });
    } else {
        // periodInMinutes必须是整数
        await chrome.alarms.create(name, { periodInMinutes: duration/60/1000 });
    }
}

// utils/config.js
function get360WebshieldConfig() {
    return {
        "stat": {
            "dau": {
                "res": "UA-102283103-1",
                "rate": "10"
            },
            "agreement": {
                "res": "UA-102283103-1",
                "rate": "100"
            },
            "shopping_on_off": {
                "res": "UA-102283103-1",
                "rate": "100"
            },
            "shopping_normal": {
                "res": "UA-102283103-2",
                "rate": "15"
            },
            "popup": {
                "res": "UA-102283103-4",
                "rate": "100"
            }
        },
        "stat_ff": {
            "dau": {
                "res": "UA-102283103-5"
            },
            "agreement": {
                "res": "UA-102283103-5"
            },
            "shopping_on_off": {
                "res": "UA-102283103-5"
            },
            "shopping_normal": {
                "res": "UA-102283103-5"
            },
            "popup": {
                "res": "UA-102283103-5"
            }
        }
    };
}

// utils/debug.js
function isDebug() {
    return false;
}

function isStatDebug() {
    return false;
}

function consoleLog(msg) {
    if (isDebug()) {
        console.log(msg);
    }
}

// utils/common.js
function getBrowserInfoEx() {
    var browser = {
        version: navigator.appVersion, agent: navigator.userAgent,
        appname: navigator.appName, fullversion: ''+parseFloat(navigator.appVersion),
        majorversion: parseInt(navigator.appVersion,10),
        shellAppName: '',
        shellAppVer: ''
    }
    var nameOffset,verOffset,ix;

    // In Opera 15+, the true version is after "OPR/" 
    if ((verOffset=browser.agent.indexOf("OPR/"))!=-1) {
     browser.appname = "opera";
     browser.fullversion = browser.agent.substring(verOffset+4);
    }
    // In older Opera, the true version is after "Opera" or after "Version"
    else if ((verOffset=browser.agent.indexOf("Opera"))!=-1) {
     browser.appname = "opera";
     browser.fullversion = browser.agent.substring(verOffset+6);
     if ((verOffset=browser.agent.indexOf("Version"))!=-1) 
       browser.fullversion = browser.agent.substring(verOffset+8);
    }
    else if ((verOffset=browser.agent.indexOf("YaBrowser/"))!=-1) {
     browser.appname = "yandex";
     browser.fullversion = browser.agent.substring(verOffset+10);
    }
    // In MSIE, the true version is after "MSIE" in userAgent
    else if ((verOffset=browser.agent.indexOf("MSIE"))!=-1) {
     browser.appname = "ie";
     browser.fullversion = browser.agent.substring(verOffset+5);
    }
    // In Chrome, the true version is after "Chrome" 
    else if ((verOffset=browser.agent.indexOf("Chrome"))!=-1) {
      browser.appname = "chrome";
      if(browser.agent.indexOf("x64")!=-1)
      {
        browser.appname += "64";
      }
      // 支持识别国际版SE
      if (browser.agent.indexOf("QIHU 360SEi18n") > -1) {
        browser.shellAppName = "360SEi18n";
        browser.shellAppVer = browser.agent.substring(verOffset+7);
      }
     browser.fullversion = browser.agent.substring(verOffset+7);
    }
    // In Safari, the true version is after "Safari" or after "Version" 
    else if ((verOffset=browser.agent.indexOf("Safari"))!=-1) {
     browser.appname = "safari";
     browser.fullversion = browser.agent.substring(verOffset+7);
     if ((verOffset=browser.agent.indexOf("Version"))!=-1) 
       browser.fullversion = browser.agent.substring(verOffset+8);
    }
    // In Firefox, the true version is after "Firefox" 
    else if ((verOffset=browser.agent.indexOf("Firefox"))!=-1) {
     browser.appname = "firefox";
     browser.fullversion = browser.agent.substring(verOffset+8);
    }
    // In most other browsers, "name/version" is at the end of userAgent 
    else if ( (nameOffset=browser.agent.lastIndexOf(' ')+1) < 
              (verOffset=browser.agent.lastIndexOf('/')) ) 
    {
     browser.appname = browser.agent.substring(nameOffset,verOffset);
     browser.fullversion = browser.agent.substring(verOffset+1);
     if (browser.appname.toLowerCase()==browser.appname.toUpperCase()) {
      browser.appname = navigator.appName;
     }
    }
    // trim the browser.fullversion string at semicolon/space if present
    if ((ix=browser.fullversion.indexOf(";"))!=-1)
       browser.fullversion=browser.fullversion.substring(0,ix);
    if ((ix=browser.fullversion.indexOf(" "))!=-1)
       browser.fullversion=browser.fullversion.substring(0,ix);

    majorVersion = parseInt(''+browser.fullversion,10);
    if (isNaN(majorVersion)) {
     browser.fullversion  = ''+parseFloat(navigator.appVersion); 
     browser.majorversion = parseInt(navigator.appVersion,10);
    }

    return browser;
}

function getChromeExtUrl() {
    return  "https://chrome.google.com/webstore/detail/360-internet-protection/glcimepnljoholdmjchkloafkggfoijh";
}

function getOperaExtUrl() {
    "https://addons.opera.com/" + getUILang().toLowerCase() + "/extensions/details/360-internet-protection";
}

function getYandexExtUrl() {
    return getOperaExtUrl();
}

function getCopyRightDesc() {
    var desc = chrome.i18n.getMessage('copy_right_desc');
    var year = new Date().getFullYear();
    return desc.replace('YEAR', year);
}

function getUILang() {
    var lang = chrome.i18n.getUILanguage();
    var agent = getBrowserInfoEx().appname.toLowerCase();
    if (agent.indexOf("firefox") != -1 ) {
        lang = lang.replace('_', '-');
    }

    if (lang.indexOf("en") != -1 
        || lang.indexOf("es") != -1 
        || lang.indexOf("pt") != -1) {
        lang = lang.split('-')[0];
    }

    return lang;
}
// utils/type.js
var Event = {
    "refresh_tab": 0,
    "create_tab": 1,
    "update_tab": 2,
    "remove_tab": 3,
    "session_beat": 4,
    "test_host": 5,
    "installed": 6,
    "repalce_tab": 7,
    "request_tab":9,
    "transType_tab":10,
    "active_tab":11,
    "focus_window":12,
    "version": 1000,
    "icon_status_notify": 1001,
    "popup_status_query": 1002,
    "popup_status_result": 1003,
    "enable_netpay": 1007,
    "disable_netpay": 1008,
    "netpay_changed": 1009,
    "scan_start": 1010,
    "scan_end": 1011,
    "enter_shopping": 1012,
    "risk_processed": 1013,
    "site_access_query": 1014,
    "site_access_result": 1015,
    "antitrack_status_changed": 1016,
    "antitrack_host_notify": 1017,
    "popup_protect_state": 1018,
    "wd_helper": 1019,
    "popup_privacy_page_state": 1020,
}

var Request = {
    "show_toast": "show_toast",
    "get_product_id": "get_product_id",
    "enable_toolbar_icon": "enable_toolbar_icon",
	"enable_toolbar_icon_status": "enable_toolbar_icon_status",
    "on_antitrack_inject": "on_antitrack_inject",
    "agree_to_privacy_policy": "agree_to_privacy_policy",
    "get_compatiable_state": "get_compatiable_state",
    "inject_script": "inject_script",
    'stat_popup': 'stat_popup',
    "check_promo_prerequisite": "check_promo_prerequisite",
    "promo_prerequisite_ok": "promo_prerequisite_ok",
    "store_consultant_accepted": "store_consultant_accepted",
    "on_wd_helper_inject" : "on_wd_helper_inject",
    "on_wd_helper_support": "on_wd_helper_support",
    "popup_privacy_page_agree": "popup_privacy_page_agree",
}

var CompatibleState = {
    "none": "none",
    "base": "base",
    "compatible": "compatible",
    "upgrade_env": "upgrade_env",
    "upgrade_plugin": "upgrade_plugin",
    "upgrade_browser": "upgrade_browser",
    "enable_siteaccess": "enable_siteaccess",
    "unsupported_platform": "unsupported_platform"
}

var ProductId = {
    "ts": "ts",
    "safe": "safe"
}

var GlovalKey = {
    "areacode": "areacode",
    "cid": "cid"
}

// utils/pref.js
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

function getGlobalValue(key, callback) {
    // return localStorage[key];
    chrome.storage.local.get(key,
        function(items) {
            // console.log('getGlobalValue-获取缓存中的值', key, items);
            if (items != undefined && items[key] != undefined) {
                callback(items[key]);
                consoleLog("getPref(" + key + ") = value:" + items[key]);
            } else {
                callback(null);
            }
        });
}

function setGlobalValue(key, value) {
    // localStorage[key] = value;
    var obj = {};
    obj[key] = value;
    chrome.storage.local.set(obj, function() {
        consoleLog("setPref(" + key + ") = value:" + value);
    });
}

// utils/product.js
var browserInfo = null;

// utils/stat.js
var _gaq = _gaq || [];
var chromelike = getBrowserInfoEx().appname.toLowerCase().indexOf("firefox") == -1;
var privacyPolicyChecked = true;

function setPrivacyPolicy(checked) {
    privacyPolicyChecked = checked;
}

function trackPage() {
    if (!privacyPolicyChecked) {
        return;
    }
    
    if (chromelike) {
        trackChromePage();
    } else {
        trackFirefoxPage();
    }
}

function trackChromePage() {
    var config = Rule.getIns().getStatConfig().getDau();
    var res = config.getRes();
    var rate = config.getRate();
    var page = null;
    
    if (isStatDebug()) {
        page = '/background_debug.html';
    } else {
        page = '/background.html';
    }
    
    _gaq.push(['_setAccount', res]);
    _gaq.push(['_setSampleRate', rate]);
    _gaq.push(['_trackPageview', page]);
    
    consoleLog("[stat] trackPage -> page: " + page + ", res:" + res + ", sample rate:" + rate);
}

function trackFirefoxPage() {
    var config = Rule.getIns().getStatFirefoxConfig().getDau();
    var res = config.getRes();
    var page = null;
    
    if (isStatDebug()) {
        page = '/background_debug.html';
    } else {
        page = '/background.html';
    }
    
    GaCollect.getIns().trackPage(res, page);
    
    consoleLog("[stat] trackPage -> page: " + page + ", res:" + res);
}

var Stat = function() {
    this.params = {};
    this.params['id'] = null;
    this.params['label'] = null;
    this.params['rate'] = '100';
};
Stat.Type = {
    'Shopping': 'shopping',
    'Popup' : 'popup'
};
Stat.Action = {
    'AcceptOffer':'accept_offer',
    'DeclineOffer':'decline_offer',
    'CancelOffer':'cancel_offer',
    'Display':'display'
};
Stat.PromoAction = {
    'Normal':'normal'
};
Stat.PromoLabel = {
    'On':'on',
    'Off':'off',
    'NeverPopup' : 'never_pop_up'
};
Stat.PopupAction = {
    'Unknown':'unknown',
    'Safe':'safe',
    'Shopping':'shopping',
    'Payment': 'payment',
    'Risk':'risk',
    'Checking':'checking'
};

Stat.prototype.setTrackId = function(id){
    this.params['id'] = id;
    return this;
};
Stat.prototype.setType = function(type){
    this.params['type'] = type;
    return this;
};
Stat.prototype.setAction = function(act){
    this.params['action'] = act;
    return this;
};
Stat.prototype.setLabel = function(label){
    this.params['label'] = label;
    return this;
};
Stat.prototype.setSampleRate = function(rate){
    this.params['rate'] = rate;
    return this;
};
Stat.prototype.finish = function(){
    if (!privacyPolicyChecked) {
        return;
    }
    
    if (this.params['id'] == null) {
        consoleLog("[stat] id null");
        return;
    }
    
    if (isStatDebug()) {
        this.params['type'] = this.params['type'] + '_' + 'debug';
        this.params['label'] = this.params['label'] + '_' + Math.floor(new Date().getTime() / 1000);
    }
    
    if (chromelike) {
        gaPush(this.params['id'], this.params['rate'], this.params['type'], this.params['action'], this.params['label']);
    } else {
        gaPushForFirefox(this.params['id'], this.params['type'], this.params['action'], this.params['label']);
    }
    
    consoleLog("[stat] finish -> " + JSON.stringify(this.params));
};

function gaPush(resid, rate, type, action, label) {
    _gaq.push(['_setAccount', resid ]);
    _gaq.push(['_setSampleRate', rate ]);
    _gaq.push(['_trackEvent', type, action, label ]);
}

function gaPushForFirefox(resid, type, action, label) {
    GaCollect.getIns().sendEvent(resid, type, action, label);
}


// utils/rule.js
function ActionSwitcher(rule) {
    this.enabled = true;
    this.safewebsiteInjected = true;
    
    this.isEnabled = function() {
        return this.enabled;
    }
    
    this.isSafeWebsiteInjected = function() {
        return this.safewebsiteInjected;
    }
    
    if (rule.enabled != undefined) {
        this.enabled = rule.enabled;
    }
}

function StatRes(rule) {
    this.res = null;
    this.rate = null;
    
    this.getRes = function() {
        return this.res;
    }
    
    this.getRate = function() {
        return this.rate;
    }
    
    if (rule.res != undefined) {
        this.res = rule.res;
    }
    
    if (rule.rate != undefined) {
        this.rate = rule.rate;
    }
}

function StatConfig(rule) {
    this.dau = new StatRes({});
    this.agreement = new StatRes({});
    this.shoppingOnOff = new StatRes({});
    this.shoppingNormal = new StatRes({});
    this.popup = new StatRes({});
    
    this.getDau = function() {
        return this.dau;
    }
    this.getAgreement = function() {
        return this.agreement;
    }
    this.getShoppingOnOff = function() {
        return this.shoppingOnOff;
    }
    this.getShoppingNormal = function() {
        return this.shoppingNormal;
    }
    this.getPopup = function() {
        return this.popup;
    }
    
    if (rule.dau != undefined) {
        this.dau = new StatRes(rule.dau);
    }
    if (rule.agreement != undefined) {
        this.agreement = new StatRes(rule.agreement);
    }
    if (rule.shopping_on_off != undefined) {
        this.shoppingOnOff = new StatRes(rule.shopping_on_off);
    }
    if (rule.shopping_normal != undefined) {
        this.shoppingNormal = new StatRes(rule.shopping_normal);
    }
    if (rule.popup != undefined) {
        this.popup = new StatRes(rule.popup);
    }
}

var Rule = (function () {
    var instance;
    var dynamicSync = false;
    var cacheDirtyTimeOut = 28800;
    var syncTime = 0;
    var statconfig = null;
    var statconfigff = null;
    
    function getCurTime() {
        return curTime = Math.floor(new Date().getTime() / 1000);
    }
    
    function initConfig(config) {        
        if (config.stat != undefined) {
            statconfig = new StatConfig(config.stat);
        } else {
            // rule is malformat
            statconfig = new StatConfig({});
        }
        
        if (config.stat_ff != undefined) {
            statconfigff = new StatConfig(config.stat_ff);
        } else {
            // rule is malformat
            statconfigff = new StatConfig({});
        }
        
        consoleLog("[rule] synced:" + JSON.stringify(config));
        
    }
    
    function init() {
        initConfig(get360WebshieldConfig());
        
        return {
            getStatConfig: function() {
                return statconfig;
            },
            getStatFirefoxConfig: function() {
                return statconfigff;
            }
        };
    }
    
    return {
        getIns: function () {
            if (!instance) {
                instance = init();
            }
            return instance;
        }
    };
})();

function overrideUserAgent(event) {

    function shuffle(array) {
      var currentIndex = array.length,
        temporaryValue,
        randomIndex;
      while (0 !== currentIndex) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
      }
      return array;
    }
    
    function plugin_convert(plugin_list, randstr, prePlugins) {
      if (randstr.length > 1) {
        randstr = randstr.substr(1, randstr.length - 1);
      }
      var plugins = [];
      try {
        if (plugin_list != undefined && plugin_list != null) {
          for (var i = 0; i < prePlugins.length; i++) {
            plugins.push({
              name: prePlugins[i].name,
              description: prePlugins[i].description,
              filename: prePlugins[i].filename,
              0: {
                type: prePlugins[i][0].type,
                suffixes: prePlugins[i][0].suffixes,
                description: prePlugins[i][0].description,
              },
            });
          }
          for (var j = 0; j < plugin_list.length; j++) {
            plugins.push({
              name: plugin_list[j] + randstr,
              description: randstr,
              filename: randstr,
              0: {
                type: "0",
                suffixes: "",
                description: "",
              },
            });
          }
        }
      } catch (e) {
        plugins = [];
      }
      plugins = shuffle(plugins);
      return JSON.stringify(plugins);
    }

    event = JSON.parse(event)
    if ("object" != typeof event || event[0] === false) return;
    var userAgent = navigator.userAgent + '/' + event[1];
    var prePlugins = navigator.plugins;
    Object.defineProperty(navigator, "plugins", {
        get: function () {
          return plugin_convert(event[2], event[1], prePlugins)
        },
        enumerable: true,
        configurable: true,
      });
      Object.defineProperty(navigator, "userAgent", {
        get: function () {
          return userAgent
        },
        configurable: true,
      });
}

function inject360Func (){
    function wdHelper(func, parameter, callback) { let requestId = new Date().getTime(); return new Promise((resolve => { function t(event) { if (event.data.type && event.data.type == "wd_extension_recv" && event.data.requestId == requestId) { window.removeEventListener("message", t); ret = { ret: event.data.ret, err: event.data.err }; if (typeof callback == "function") { callback(ret) } else { resolve(ret) } } } window.addEventListener("message", t, false); window.postMessage({ type: "wd_extension", requestId: requestId, func: func, parameter: parameter }, '*'); if (typeof callback == "undefined") { setTimeout(() => { window.removeEventListener("message", t); resolve({ ret: null, err: 1 }); }, 1000 * 2); } })); }
    window.wdHelper = wdHelper;
}

// antitrack/headers.js
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



// antitrack/randexp.min.js
function RandExp (min = 8, max = 20) {
    let len = (max - min + 1) * Math.random() + min;
    len = Math.floor(len);
    let arr = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    let res = '';
    for(let i = 0;i < len;i++){
        let index = Math.floor(arr.length * Math.random());
        res += arr[index];
    }
    return res;
}

// antitrack/antitrack.js
//Includes randexp.min.js | v0.4.6 | https://github.com/fent/randexp.js

"use strict";
var AntiTrack = {
    enable_antitrack : false,
    beat_tick:0,
    settings: {

        isEnabled: function() {
            return  AntiTrack.enable_antitrack
        },
        setEenabled: function(e) {
            // set enable_antitrack to storage then popup can access
            AntiTrack.enable_antitrack = e
         },
    },
    useragent: {
        agents: {},
        RandomAgent: function() {
            return RandExp(8, 20)
           },
        GetAgent: function(id) {
            if(!AntiTrack.useragent.agents.hasOwnProperty(id)){
                AntiTrack.useragent.agents[id] =  AntiTrack.useragent.RandomAgent();
            }
         return AntiTrack.useragent.agents[id]
        },
        Update: function() {
            AntiTrack.beat_tick =0;
            for(let id in AntiTrack.useragent.agents){
                AntiTrack.useragent.agents[id] =  AntiTrack.useragent.RandomAgent();
            }

           },
    },
    tabstate: {
        tab: {},
        GetTabState: function(id){
            if(!this.tab.hasOwnProperty(id)){
                this.tab[id] = false;
            }
            return this.tab[id];
        },
        UpdateTabState:function(id,state){
            this.tab[id] = state;
        }
    },
    getHostname: function(url) {
        return new URL(url).hostname;
    },
   
    exclude_list: [],
    plugin_list: ["Account Helper", "Login Reminder", "Audio Clock"],
};

function AntiTrackAgentUpdate(obj) {
    if(AntiTrack.settings.isEnabled()){
        if( AntiTrack.beat_tick >=30){
            AntiTrack.useragent.Update();
        }
        AntiTrack.beat_tick++;
    }
}
function AntiTrackStateChanged(obj) {
    try
    {
        if(!obj.hasOwnProperty('enable_antitrack')) {
            return;
        }
       
        if(obj.enable_antitrack){     
          AntiTrack.useragent.Update();
          setPref(Prop.enable_antitrack, obj.enable_antitrack);
          AntiTrack.settings.setEenabled(obj.enable_antitrack);      
        }else{
          setPref(Prop.enable_antitrack,false);
          AntiTrack.settings.setEenabled(false);
        }                   
        consoleLog("AntiTrackStateChanged -> " + ",enable_antitrack:" +AntiTrack.settings.isEnabled());
        if(obj.hasOwnProperty('exclude_list')) {
        AntiTrack.exclude_list = obj.exclude_list;
        } 

    }
    catch (e) {
     consoleLog("AntiTrackStateChanged not support AntiTrack");
     }
 
}


// wdsupport/wd_support.js
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


// background.js

var port = null;
var hbstate = 0;
var lang=getUILang();
var i18nReport="https://info.url.cloud.360safe.com/";
var i18nPage = "/plug.php?";
var productId = null;
var compatibleState = CompatibleState.none;
var installedDetails = null;
var curExtVer = null;
var browserType = null;
var openerTabId = 0;


var WebStatus = {
    "unknown":0, 
    "checking":1, 
    "safe":2, 
    "risk":3, 
    "shopping":4,
    "payment":5
}

function getBrowserInfoEx() {
    var browser = {
        version: navigator.appVersion, agent: navigator.userAgent,
        appname: navigator.appName, fullversion: ''+parseFloat(navigator.appVersion),
        majorversion: parseInt(navigator.appVersion,10),
        shellAppName: '',
        shellAppVer: ''
    }
    var nameOffset,verOffset,ix;
    if ((verOffset = browser.agent.indexOf("Edg/")) != -1) {
        browser.appname = "msedge";
        browser.fullversion = browser.agent.substring(verOffset + 4);
    }
    // In Opera 15+, the true version is after "OPR/" 
    else if ((verOffset=browser.agent.indexOf("OPR/"))!=-1) {
     browser.appname = "opera";
     browser.fullversion = browser.agent.substring(verOffset+4);
    }
    // In older Opera, the true version is after "Opera" or after "Version"
    else if ((verOffset=browser.agent.indexOf("Opera"))!=-1) {
     browser.appname = "opera";
     browser.fullversion = browser.agent.substring(verOffset+6);
     if ((verOffset=browser.agent.indexOf("Version"))!=-1) 
       browser.fullversion = browser.agent.substring(verOffset+8);
    }
    else if ((verOffset=browser.agent.indexOf("YaBrowser/"))!=-1) {
     browser.appname = "yandex";
     browser.fullversion = browser.agent.substring(verOffset+10);
    }
    // In MSIE, the true version is after "MSIE" in userAgent
    else if ((verOffset=browser.agent.indexOf("MSIE"))!=-1) {
     browser.appname = "ie";
     browser.fullversion = browser.agent.substring(verOffset+5);
    }
    // In Chrome, the true version is after "Chrome" 
    else if ((verOffset=browser.agent.indexOf("Chrome"))!=-1) {
      browser.appname = "chrome";
      if(browser.agent.indexOf("x64")!=-1)
      {
        browser.appname += "64";
      }
      // 支持识别国际版SE
      if (browser.agent.indexOf("QIHU 360SEi18n") > -1) {
        browser.shellAppName = "360SEi18n";
        browser.shellAppVer = browser.agent.substring(verOffset+7);
      }
     browser.fullversion = browser.agent.substring(verOffset+7);
    }
    // In Safari, the true version is after "Safari" or after "Version" 
    else if ((verOffset=browser.agent.indexOf("Safari"))!=-1) {
     browser.appname = "safari";
     browser.fullversion = browser.agent.substring(verOffset+7);
     if ((verOffset=browser.agent.indexOf("Version"))!=-1) 
       browser.fullversion = browser.agent.substring(verOffset+8);
    }
    // In Firefox, the true version is after "Firefox" 
    else if ((verOffset=browser.agent.indexOf("Firefox"))!=-1) {
     browser.appname = "firefox";
     browser.fullversion = browser.agent.substring(verOffset+8);
    }
    // In most other browsers, "name/version" is at the end of userAgent 
    else if ( (nameOffset=browser.agent.lastIndexOf(' ')+1) < 
              (verOffset=browser.agent.lastIndexOf('/')) ) 
    {
     browser.appname = browser.agent.substring(nameOffset,verOffset);
     browser.fullversion = browser.agent.substring(verOffset+1);
     if (browser.appname.toLowerCase()==browser.appname.toUpperCase()) {
      browser.appname = navigator.appName;
     }
    }
    // trim the browser.fullversion string at semicolon/space if present
    if ((ix=browser.fullversion.indexOf(";"))!=-1)
       browser.fullversion=browser.fullversion.substring(0,ix);
    if ((ix=browser.fullversion.indexOf(" "))!=-1)
       browser.fullversion=browser.fullversion.substring(0,ix);

    majorVersion = parseInt(''+browser.fullversion,10);
    if (isNaN(majorVersion)) {
     browser.fullversion  = ''+parseFloat(navigator.appVersion); 
     browser.majorversion = parseInt(navigator.appVersion,10);
    }

    return browser;
}
function ProtectStateChanged(obj) {
    if(obj.status){
        if(compatibleState == CompatibleState.enable_siteaccess){
            compatibleState = CompatibleState.compatible;
        }
    }
    else{
        if(compatibleState == CompatibleState.compatible){
            compatibleState = CompatibleState.enable_siteaccess;
        }
    }
}

function procNativeMessage(message) {//msg from native host
    for (var i = 0; i < message.length; i++) {
        var jsonObject = message[i];
        if (typeof (jsonObject.event) != "undefined") {
            consoleLog("procNativeMessage -> jsonObject:" + JSON.stringify(jsonObject));
            
            if (jsonObject.event == Event.session_beat) {
                hbstate = 1;
                testNativeHost(Event.test_host);
                AntiTrackAgentUpdate();
            } else if (jsonObject.event == Event.installed) {//install ok
                if (browserType.indexOf("firefox") != -1) {
                    //var visturl = i18nReport+"plugin"+i18nPage+"la="+lang+"&rq=2";
					consoleLog("insatll ok，Event.installed:" + Event.installed);
					setPref(Prop.enable_toast, false);
					//chrome.tabs.create({
					//    url: chrome.extension.getURL("popup/privacy.html")
					//}, function (t) {
					//    openerTabId = t.id;
					//    consoleLog("insatll ok，openerTabId:" + openerTabId);
					//});
                } else {
                    var visturl = i18nReport+browserType+i18nPage+"la="+lang+"&rq=2";
                    chrome.tabs.create({ url: visturl });
                }
            } else if (jsonObject.event == Event.version) {
               productId = jsonObject.pid;
   
               checkWebshieldVersionState(jsonObject.version_supported, jsonObject.status);
               
               // it's always installed by default.
               if (productId == ProductId.ts) {
                   AntiTrackStateChanged(jsonObject);
               }
               if (productId == ProductId.safe) {
                    AntiTrackStateChanged(jsonObject);
                }
            } else if (jsonObject.event == Event.icon_status_notify) {
                updateToolIcon(jsonObject);
                if (compatibleState == CompatibleState.compatible){
                    trackDauState();
                }

            } else if (jsonObject.event == Event.popup_status_result) {
                if (compatibleState == CompatibleState.compatible) {
                    chrome.runtime.sendMessage({
                        type: 'update-popup',
                        data: jsonObject,
                        antiTrack: AntiTrack.enable_antitrack
                    }).catch(function(e) {
                        console.log('catch one error', e)
                    })
                    checkPromoPrerequesite(jsonObject);
                }
            } else if (jsonObject.event == Event.netpay_changed) {
                if (compatibleState == CompatibleState.compatible) updateNetpayChanged(jsonObject);
            } else if (jsonObject.event == Event.scan_start) {
                if (compatibleState == CompatibleState.compatible) updateToastToScanStart(jsonObject);
            } else if (jsonObject.event == Event.scan_end) {
                if (compatibleState == CompatibleState.compatible) updateToastToScanEnd(jsonObject);
            } else if (jsonObject.event == Event.enter_shopping) {
                if (compatibleState == CompatibleState.compatible) {
                    updateToastToShoppingProtectionOn(jsonObject);
                }
            } else if (jsonObject.event == Event.site_access_result) {
                if (compatibleState == CompatibleState.compatible) initSiteAccessState(jsonObject);
            } else if (jsonObject.event == Event.refresh_tab) {
                var vaid = jsonObject.tabid;
                var vaurl = jsonObject.url;
                chrome.tabs.update(vaid, { url: vaurl });
            } 
            else if (jsonObject.event == Event.antitrack_status_changed) {
                AntiTrackStateChanged(jsonObject);
                sendAntiTrackChangedMessage(jsonObject)
            }
            else if (jsonObject.event == Event.popup_protect_state) {
                ProtectStateChanged(jsonObject);
            }else if (jsonObject.event == Event.wd_helper && typeof wdHelper != 'undefined')
            {
                if(jsonObject.type == 0)
                {
                    wdHelper.webInit(jsonObject.nativeweb_list,jsonObject.nativeweb_script);
                }
                else if(jsonObject.type == 1)
                {
                    chrome.tabs.sendMessage(
                        jsonObject.tabid, {text: Request.on_wd_helper_support, sid : jsonObject.sid, ret : jsonObject.ret, err : jsonObject.err
                    }).catch(function(e) {
                        console.log('Failed send message, error is ', e, ', object is ', jsonObject)
                    })
                }
            }  
        }
    }
}

function onDisconnected() {
    port = null; 
    if (hbstate == 0) {//native host not exist
        var os = navigator.platform;
        
        /*if (os.indexOf("Win") > -1) {//not exist native host
            visturl += "&rq=1";
        } else {//not win os 提示一次
            visturl += "&rq=3";
        }*/
        if(os.indexOf("Win") == -1){  // not supported prompt
            if (browserType.indexOf("firefox") != -1) {
                var visturl = i18nReport+"plugin"+i18nPage+"la="+lang+"&rq=3";
                chrome.tabs.create({ url: visturl });
            } else {
                var visturl = i18nReport+browserType+i18nPage+"la="+lang+"&rq=3";
                chrome.tabs.create({ url: visturl });
            }
        }
    }
}

function createNativeHost() {
    var hostName = "com.google.chrome.wdwedpro";
    port = chrome.runtime.connectNative(hostName);
    port.onMessage.addListener(procNativeMessage);
    port.onDisconnect.addListener(onDisconnected);
}

function callNativeHost(id,url,et) {
    var msg=[{"tabid":id,"url":url,"event":et}];
    if ( port != null ) {
        port.postMessage(msg);
    }
}

function callNativeHostWithInfo(id,url,et, opid,info) {
    var msg=[{"tabid":id,"url":url,"event":et, "openerId": opid,"windowid":info.windowId,"info":info}];
    if ( port != null ) {
        port.postMessage(msg);
    }
}

function notifyUpdateTab(addid,removeid,url,windowId) {
    var msg=[{"tabid":addid,"removeid":removeid,"url":url,"windowid":windowId,"event":Event.repalce_tab}];
    if ( port != null ) {
        port.postMessage(msg);
    }
}

function notifyActiveTab(tabid,windowId,title) {
    var msg=[{"tabid":tabid,"windowid":windowId,"title":title,"event":Event.active_tab}];
    if ( port != null ) {
        port.postMessage(msg);
    }
}

function notifyFocusWindow(windowId){
    var msg=[{"windowid":windowId,"event":Event.focus_window}];
    if ( port != null ) {
        port.postMessage(msg);
    }
}

function callNative(tabid, url, sid, func, parameter){
    var msg=[{"tabid" :tabid,"url":url, "sid" :sid, "func":func, "parameter" : parameter ,"event":Event.wd_helper}];
    if ( port != null ) {
        port.postMessage(msg);
    }
}

function testNativeHost(et) {
    if (port != null) {
        port.postMessage([{"event":et}]);
   }
}

function procUrl(tabId, url,et) {
    callNativeHost(tabId, url,et);
}

function procUrlWithInfo(tabId, url,et, info) {
    callNativeHostWithInfo(tabId, url, et,0, info);
}
function procUrlWithOpenerId(tabId, url, et, openerId, info) {
    callNativeHostWithInfo(tabId, url, et, openerId, info);
}

function callNativeHostWithTransType(id, url, et, transtype, transqualifiers) {
    var msg = [{
        "tabid": id,
        "url": url,
        "event": et,
        "transtype": transtype,
        "transqualifiers": transqualifiers
    }];
    if (port != null) {
        port.postMessage(msg);
    }
}


function callNativeHostWithRequestStaus(id, url, status, requestId, et, details) {
    var msg = [{
        "tabid": id,
        "requestId": requestId,
        "url": url,
        "event": et,
        "requestStatus": status,
        "details": details
    }];
    if (port != null) {
        port.postMessage(msg);
    }
}

function setContextInfo() {
    var browserInfo = getBrowserInfoEx();
    if (browserInfo.appname.indexOf("firefox") != -1) {
        curExtVer = browser.runtime.getManifest().version;
    } else {
        curExtVer = chrome.runtime.getManifest().version;
    }
    consoleLog("browser name:" + browserInfo.appname + ",browser ver:" + browserInfo.version + ", ext ver:" + curExtVer);
    if (port != null) {
        var bname = browserInfo.appname;
        var bname2 = browserInfo.appname;
        var bver = browserInfo.fullversion
        if(bname == "msedge"){
            bname = "chrome";
        }
        if (browserInfo.shellAppName) {
            bname = browserInfo.shellAppName
            bname2 = browserInfo.shellAppName
        }
        if (browserInfo.shellAppVer) {
            bver = browserInfo.shellAppVer
        }
        port.postMessage([{ "bname": bname, "bname2": bname2, "bver": bver, "ever": curExtVer}]);
    }
}

// last digit build checking ignored 
//
// 1: ver1 > ver2
// 0: ver1 == ver2
//-1: ver1 < ver2
function compareVersion(ver1, ver2) {
    var a = ver1.split('.');
    var b = ver2.split('.');

    for (var i = 0; i < a.length; ++i) {
        a[i] = Number(a[i]);
    }
    for (var i = 0; i < b.length; ++i) {
        b[i] = Number(b[i]);
    }
    
    if (a[0] > b[0]) return 1;
    if (a[0] < b[0]) return -1;
    if (a[1] > b[1]) return 1;
    if (a[1] < b[1]) return -1;
    
    return 0;
}
    
function checkWebshieldVersionState(curWebShieldVerSupported, supported) {
    var verState = compareVersion(curExtVer, curWebShieldVerSupported);
 
    if (verState == 1) {
        if (curWebShieldVerSupported == '2.0.14') {
            compatibleState = CompatibleState.base;
            setDefaultBrowserAction();
        } else {
            compatibleState = CompatibleState.upgrade_env;
            setUpgradeEnvAction();
        }
    } else if (verState == -1) {
        // currently silent work on base function.
        compatibleState = CompatibleState.base;
        setDefaultBrowserAction();
        
        //compatibleState = CompatibleState.upgrade_plugin;
        //setUpgradeExtensionAction();
    } else if (!checkBrowserVersionState()) {
        compatibleState = CompatibleState.upgrade_browser;
        setUpgradeBrowserAction();
    } else {
        compatibleState = CompatibleState.compatible;
        setDefaultBrowserAction();
        setOnConnectListener();
        resotrPrefs();
        
        checkSiteAccessState();
        
        initStat(productId);
    }
    
    consoleLog("checkWebshieldVersionState -> compatibleState:" +compatibleState);
}

function initStat(productId) {
    if (productId != ProductId.ts) {
        return;
    }
}

function checkSiteAccessState() {
    var msg=[{"event":Event.site_access_query}];
    port.postMessage(msg);
}

function checkBrowserVersionState() {
    var browserInfo = getBrowserInfoEx();
    consoleLog("browserInfo:" + JSON.stringify(browserInfo));
    
    if (browserInfo.appname == 'opera' && compareVersion(browserInfo.fullversion, '32') == -1) {
        consoleLog("opera too old");
        return false;
    }
    
    return true;
}

function setUpgradeExtensionAction() {
    consoleLog("setUpgradeExtensionAction");
    
    chrome.action.setPopup({
        popup: 'popup/upgradeext.html'
    });
    chrome.action.setIcon({
        path: {
            "19": "images/unknown_icon_19.png",
            "38": "images/unknown_icon_38.png"
        }
    });
    chrome.action.setTitle({
        title: chrome.i18n.getMessage('unknown_tips')
    });
}

function setSiteAccessDisabledBrowserAction() {
    consoleLog("setSiteAccessDisabledBrowserAction");
    
    chrome.action.setPopup({
        popup: 'popup/siteaccess.html'
    });
    chrome.action.setIcon({
        path: {
            "19": "images/icon_status_disable_19.png",
            "38": "images/icon_status_disable_38.png"
        }
    });
    chrome.action.setTitle({
        title: chrome.i18n.getMessage('unknown_tips')
    });
}

function setSiteAccessDisabledAntiTrackBrowserAction() {
    consoleLog("setSiteAccessDisabledAntiTrackBrowserAction");
    
    chrome.action.setPopup({
        popup: 'popup/siteaccessantitrack.html'
    });
    chrome.action.setIcon({
        path: {
            "19": "images/unknown_icon_19.png",
            "38": "images/unknown_icon_38.png"
        }
    });
    chrome.action.setTitle({
        title: chrome.i18n.getMessage('unknown_tips')
    });
}

function setUpgradeBrowserAction() {
    chrome.action.setPopup({
        popup: 'popup/upgradebr.html'
    });
    chrome.action.setIcon({
        path: {
            "19": "images/unknown_icon_19.png",
            "38": "images/unknown_icon_38.png"
        }
    });
    chrome.action.setTitle({
        title: chrome.i18n.getMessage('unknown_tips')
    });
}

function setUpgradeEnvAction() {
    chrome.action.setPopup({
        popup: 'popup/upgradesafe.html'
    });
    chrome.action.setIcon({
        path: {
            "19": "images/unknown_icon_19.png",
            "38": "images/unknown_icon_38.png"
        }
    });
    chrome.action.setTitle({
        title: chrome.i18n.getMessage('unknown_tips')
    });
}



var bListener = false;

function setStatusDisableBrowserAction() {
    consoleLog("setStatusDisableBrowserAction");
    chrome.action.setPopup({
        popup: ''
    });
    chrome.action.setIcon({
        path: {
            "19": "images/icon_status_disable_19.png",
            "38": "images/icon_status_disable_38.png"
        }
    });
    chrome.action.setTitle({
        title: chrome.i18n.getMessage('unknown_tips')
    });

    if (bListener == false) {
        consoleLog("chrome.action.onClicked begin, bListener = " + bListener);
        chrome.action.onClicked.addListener(function (tab) {
            consoleLog("chrome.action.onClicked,openerTabId = " + openerTabId);
            if (openerTabId > 0) {
                chrome.tabs.get(openerTabId, function (t) {
                    if (t) {
                        chrome.windows.update(t.windowId, { focused: true });
                        chrome.tabs.update(openerTabId, { active: true });
                    } else {
                        chrome.tabs.create({
                            url: chrome.runtime.getURL("popup/privacy.html")
                        }, function (tab) {
                            openerTabId = tab.id;
                        });
                    }
                });
            } else {
                chrome.tabs.create({
                    url: chrome.runtime.getURL("popup/privacy.html")
                }, function (t) {
                    openerTabId = t.id;
                });
            }
        });
        bListener = true;
    }
}

function setDefaultBrowserAction() {
    consoleLog("setDefaultBrowserAction");
    chrome.action.setPopup({
        popup: 'popup/unknown.html'
    });
    chrome.action.setIcon({
        path: {
            "19": "images/unknown_icon_19.png",
            "38": "images/unknown_icon_38.png"
        }
    });
    chrome.action.setTitle({
        title: chrome.i18n.getMessage('unknown_tips')
    });
}

function setOnConnectListener() {
    chrome.runtime.onConnect.addListener(function(port) {
        consoleLog("port connected:" + port.name);
        
        if (port.name == "popup") {
            port.onMessage.addListener(function(curTab) {
                consoleLog("popup port: tab recieved" + JSON.stringify(curTab));
                triggerUpdatePopup(curTab.id, curTab.windowId);
            });
        }
    });
}

function resotrPrefs() {
    getPref(Prop.enable_toolbar, true, function(value) {
        enableToolIcon(value);
    });

    getPref(Prop.agree_to_privacy_policy, true, function(value) {
        setPrivacyPolicy(value);
    });
}

function updateNetpayChanged(msg) {
    consoleLog("updateNetpayChanged:" + JSON.stringify(msg));
    
    if (msg.status == WebStatus.shopping || msg.status == WebStatus.payment) {
        if (msg.netpay) {
            chrome.action.setIcon({
                path: {
                    "19": 'images/shopping_icon_19.png',
                    "38": 'images/shopping_icon_38.png'
                },
                tabId: msg.tabid
            });
        } else {
            chrome.action.setIcon({
                path: {
                    "19": 'images/shopping_exit_icon_19.png',
                    "38": 'images/shopping_exit_icon_38.png'
                },
                tabId: msg.tabid
            });
        }
    }
}
function IsShowUnknow(msg) {
    if(AntiTrack.enable_antitrack){
        if(msg.hasOwnProperty("url") && msg.url != undefined){
            if(msg.url.indexOf("http://") ==0 || msg.url.indexOf("https://") ==0){
               return false;
            }
        }
    }
    return true;
}
function updateToolIcon(msg) {
    consoleLog("updateToolIcon:" + JSON.stringify(msg));

    getPref(Prop.enable_toast, true, function (value) {
        if (!value && !AntiTrack.settings.isEnabled() && browserType.indexOf("firefox") != -1) {
            setStatusDisableBrowserAction();
            return;
        }

        //setDefaultBrowserAction();

        if (compatibleState == CompatibleState.compatible) {
            if (msg.status == WebStatus.unknown) {
                if (IsShowUnknow(msg)) {
                    consoleLog("updateToolIcon: popup/unknown.html 574");
                    updateToolIconInternal(msg, 'popup/unknown.html', 'images/unknown_icon', chrome.i18n.getMessage('unknown_tips'));
                }
                else {
                    consoleLog("updateToolIcon: popup/siteaccessantitrack.html 578");
                    updateToolIconInternal(msg, 'popup/siteaccessantitrack.html', 'images/unknown_icon', chrome.i18n.getMessage('enableantitrack_tips'));
                }

            } else if (msg.status == WebStatus.checking) {
                updateToolIconInternal(msg, 'popup/checking.html', 'images/checking_icon', chrome.i18n.getMessage('checking_tips'));
            } else if (msg.status == WebStatus.safe) {
                if (AntiTrack.enable_antitrack) {
                    updateToolIconInternal(msg, 'popup/safe.html', 'images/antitrack', chrome.i18n.getMessage('enableantitrack_tips'));
                }
                else
                    updateToolIconInternal(msg, 'popup/safe.html', 'images/safe_icon', chrome.i18n.getMessage('safe_tips'));
            } else if (msg.status == WebStatus.risk) {
                updateToolIconInternal(msg, 'popup/risk.html', 'images/risk_icon', chrome.i18n.getMessage('risk_tips'));
            } else if (msg.status == WebStatus.shopping || msg.status == WebStatus.payment) {
                if (msg.netpay != undefined && msg.netpay) {
                    updateToolIconInternal(msg, 'popup/shopping.html', 'images/shopping_icon', chrome.i18n.getMessage('shopping_tips'));
                } else {
                    updateToolIconInternal(msg, 'popup/shopping.html', 'images/shopping_exit_icon', chrome.i18n.getMessage('shopping_tips'));
                }
            }
        }
        else if (CompatibleState.enable_siteaccess) {
            if (AntiTrack.enable_antitrack) {
                consoleLog("updateToolIcon: popup/siteaccessantitrack.html 602");
                updateToolIconInternal(msg, 'popup/siteaccessantitrack.html', 'images/unknown_icon', chrome.i18n.getMessage('enableantitrack_tips'));
            }
            else {
                updateToolIconInternal(msg, 'popup/siteaccess.html', 'images/icon_status_disable', chrome.i18n.getMessage('unknown_tips'));
            }
        }
    });
}

function isDauTimeUp(cb) {
    var today = new Date();
    var curTime = Math.floor(today.getTime() / 1000);
    today.setDate(today.getDate() + 1);
    today.setUTCHours(0);
    today.setUTCMinutes(0);
    today.setUTCSeconds(0);
    today.setUTCMilliseconds(0);
    var nextTime = Math.floor(today.getTime() / 1000);
    consoleLog("isDauTimeUp -> nextTime:" + nextTime);
    
    getGlobalValue(Prop.next_dau_time, function (savedDauTime) {
        if (savedDauTime == null) {
            setGlobalValue(Prop.next_dau_time, nextTime);
            cb();
            return true;
        } else {
            consoleLog("isDauTimeUp -> next_dau_time:" + savedDauTime);
            
            if (curTime >= savedDauTime) {
                setGlobalValue(Prop.next_dau_time, nextTime);
                cb();
                return true;
            }
            
            return false;
        }
    });
}

function trackDauState() {
    isDauTimeUp(trackPage)
}

function updateToolIconInternal(msg, popupPath, iconPath, tips) {
    consoleLog("updateToolIconInternal begin, popupPath:" + popupPath);
    // console.log('===========setPopup=========', popupPath)
    chrome.action.setPopup({
        popup: popupPath,
        tabId: msg.tabid
    });
    chrome.action.setIcon({
        path: {
            "19": iconPath + "_19.png",
            "38": iconPath + "_38.png"
        },
        tabId: msg.tabid
    });
    chrome.action.setTitle({
        title: tips,
        tabId: msg.tabid
    });
}

function testDOMLoad(tabId, callback, retry) {
    chrome.tabs.sendMessage(tabId, {type:'test'}, function(response) {
        retry--;
        
        consoleLog("testDOMLoad:" + retry);
        
        if (retry == 0) {
            return;
        } else if (response == undefined) {
            startAlarm('timer11', 100);
            chrome.alarms.onAlarm.addListener(() => {
                testDOMLoad(tabId, callback, retry);
                chrome.alarms.clear("timer11");
            });
        } else {
            callback();
        }
    });
}

function updateToastToShoppingProtectionOn(msg) {
    consoleLog("updateToastToShoppingProtectionOn:" + JSON.stringify(msg));
    
    testDOMLoad(msg.tabid, function() {
        var request = {type: Request.show_toast, pid: productId, event: msg.event};
        if (msg.name != '') {
            request.text = chrome.i18n.getMessage('shopping_protection_on') + msg.name;
        } else {
            request.text = chrome.i18n.getMessage('shopping_protection_on_without_pattern');
        }
        
        request.status = 'safety';
        // console.log('updateToastToShoppingProtectionOn')
        chrome.tabs.sendMessage(msg.tabid, request).catch(function(e) {
            console.log('Failed to send message at testDOMLoad, e is ', e)
        });
    }, 40);
}

function updateToastToScanStart(msg) {
    updateToastToShoppingProtectionOn(msg);
}

function updateToastToScanEnd(msg) {
    var request = {type: Request.show_toast, pid: productId, event: msg.event};
    if (msg.safe) {
        request.text = chrome.i18n.getMessage('shopping_protection_no_risk');
        request.status = 'safety';
    } else {
        request.text = chrome.i18n.getMessage('shopping_protection_risk_found');
        request.status = 'risky';
    }
    // console.log('updateToastToScanEnd')
    chrome.tabs.sendMessage(msg.tabid, request).catch(function(e) {
        console.log('Failed to updateToastToScanEnd, errr is ', e)
    })
}

function enterNetPayMode(tabId) {
    var msg=[{"event":Event.enable_netpay,"tabid":tabId}];
    port.postMessage(msg);

    // console.log('========enterNetPayMode=======', msg)
    
    consoleLog("enterNetPayMode:" + JSON.stringify(msg));
}

function exitNetPayMode(tabId) {
    var msg=[{"event":Event.disable_netpay,"tabid":tabId}];
    port.postMessage(msg);
    // console.log('========exitNetPayMode=======', msg)
    
    consoleLog("exitNetPayMode:" + JSON.stringify(msg));
}

function initSiteAccessState(msg) {
    if (msg.siteaccess == 0) {
        compatibleState = CompatibleState.enable_siteaccess;
        if(AntiTrack.enable_antitrack)
        {
            setTimeout(function() {
                setSiteAccessDisabledAntiTrackBrowserAction();
            }, 1000);
        }
        else
        {
            setTimeout(function() {
                setSiteAccessDisabledAntiTrackBrowserAction();
            }, 1000);
        }
    }
}

function triggerUpdatePopup(tabId) {
    var msg=[{"tabid":tabId,"event":Event.popup_status_query}];
    port.postMessage(msg);
    
    consoleLog("triggerUpdatePopup:" + JSON.stringify(msg));
}

function setPopupPrivacyPageState(state) {
    var msg = [{ "tabid": state, "event": Event.popup_privacy_page_state }];
    if (port != null) {
        port.postMessage(msg);
    }
    consoleLog("setPopupPrivacyState:" + JSON.stringify(msg));
}

function enableToolIcon(enabled) {
    if (enabled) {
        chrome.action.enable();
    } else {
        chrome.action.disable();
    }
}

function enableToolIconStatus(staus) {
    if (staus) {
        
        if (compatibleState == CompatibleState.none) {
            setUpgradeEnvAction();
        }
        else {
            setDefaultBrowserAction();
        }
    } else {
        setStatusDisableBrowserAction();
    }
}

function statPopup(id) {
    var action = null;
    
    if (id == 'safe-container') {
        action = Stat.PopupAction.Safe;
    } else if (id == 'risk-container') {
        action = Stat.PopupAction.Risk;
    } else if (id == 'pay-container') {
        action = Stat.PopupAction.Payment;
    } else if (id == 'shopping-container') {
        action = Stat.PopupAction.Shopping;
    } else if (id == 'unknown-container') {
        action = Stat.PopupAction.Unknown;
    } else if (id == 'checking-container') {
        action = Stat.PopupAction.Checking;
    } else {
        return false;
    }
    
    var config =
        browserType.indexOf("firefox") != -1 ?
        Rule.getIns().getStatFirefoxConfig().getPopup() :
        Rule.getIns().getStatConfig().getPopup();
    
    new Stat().setTrackId(config.getRes()).setType(Stat.Type.Popup).setAction(action).setSampleRate(config.getRate()).finish();
    return true;
}

function setMessageListener() {
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        consoleLog("onMessage:" + JSON.stringify(sender));
        
        if (request.text == Request.get_product_id) {
            sendResponse(productId);
        } else if (request.text == Request.stat_popup) {
            sendResponse(statPopup(request.id));
        } else if (request.text == Request.enable_toolbar_icon) {
            sendResponse(enableToolIcon(request.state));
        } else if (request.text == Request.enable_toolbar_icon_status) {
            sendResponse(enableToolIconStatus(request.state));
        }else if (request.text == Request.on_antitrack_inject) {
            var e = [];
            e[0] = false;
            if(AntiTrack.settings.isEnabled()){
                var find = false;
                if (request.hasOwnProperty("url")) {
                    try {
                        AntiTrack.exclude_list.forEach(function f(e, u, a) {
                            if ( request.url.indexOf(e) != -1) {
                                find = true;
                                throw Error();  
                            }
                        });
                    } catch (e) {
                        
                    }
                }
                if (!find ) {
                    e[0] = true;
                    e[1] = AntiTrack.useragent.GetAgent(sender.tab.id);
                    e[2] = AntiTrack.plugin_list;
                    if (request.hasOwnProperty("url"))
                        callNativeHost(0, request.url, Event.antitrack_host_notify);
                    chrome.scripting.executeScript({
                        target: { tabId : sender.tab.id, allFrames: true },
                        world: 'MAIN',
                        func: overrideUserAgent,
                        args: [JSON.stringify(e)],
                    });
                }
            }

        } else if (request.text == Request.agree_to_privacy_policy) {
            sendResponse(setPrivacyPolicy(request.state));
        } else if (request.text == Request.get_compatiable_state) {
           /*
            * response: {pid:xxx, state:xxx}
            */
            sendResponse({state:compatibleState, pid:productId});
    

        } else if (request.text == Request.check_promo_prerequisite) {
            sendResponse(triggerUpdatePopup(sender.tab.id, sender.tab.windowId));
        } else if (request.text == Request.inject_script) {
            sendResponse(0);
        } else if (request.text == Request.store_consultant_accepted) {
            var config = 
                browserType.indexOf("firefox") != -1 ? 
                Rule.getIns().getStatFirefoxConfig().getAgreement() :
                Rule.getIns().getStatConfig().getAgreement();
            
            if (request.state) {
                new Stat().setTrackId(config.getRes()).setType(Stat.Type.StoreConsultant).setAction(Stat.Action.AcceptOffer).setSampleRate(config.getRate()).finish();
            } else {
                new Stat().setTrackId(config.getRes()).setType(Stat.Type.StoreConsultant).setAction(Stat.Action.DeclineOffer).setSampleRate(config.getRate()).finish();
            }
        } else if (request.text == Request.on_wd_helper_inject && typeof wdHelper != 'undefined'){
            if(wdHelper.webSupport(request.url))
            {
                chrome.scripting.executeScript({
                    target: { tabId : sender.tab.id, allFrames: true },
                    world: 'MAIN',
                    func: inject360Func,
                });
                sendResponse(1);
            }
            else{
                sendResponse(0);
            }
        } else if (request.text == Request.on_wd_helper_support)
        {
            callNative(sender.tab.id,sender.url, request.sid,request.func, request.parameter);
        } else if (request.text == Request.popup_privacy_page_agree) {
            sendResponse(setPopupPrivacyPageState(request.state));
        }
    });
}


function procWebNavigation(details) {
    if (details.transitionType != "auto_subframe") {
        var transitionQualifiers = 0;
        for (var i = 0; i < details.transitionQualifiers.length; i++) {
            if (details.transitionQualifiers[i] == 'client_redirect') {
                transitionQualifiers |= 0x00020000;
            }
            if (details.transitionQualifiers[i] == 'server_redirect') {
                transitionQualifiers |= 0x80000000;
            }
            if (details.transitionQualifiers[i] == 'forward_back') {
                transitionQualifiers |= 0x00040000;
            }
            if (details.transitionQualifiers[i] == 'from_address_bar') {
                transitionQualifiers |= 0x02000000;
            }
        }

        callNativeHostWithTransType(details.tabId, details.url, Event.transType_tab, details.transitionType, transitionQualifiers);

    }
}

function listenPopup() {
    chrome.runtime.onMessage.addListener(function (request) {
        var type = request.type
        var data = request.data
        if (type === 'exit-net-pay-mode') {
            exitNetPayMode(data.tabId)
        } else if (type === 'enter-net-pay-mode') {
            enterNetPayMode(data.tabId)
        }
    })
}
function initExtension() {
    browserType = getBrowserInfoEx().appname.toLowerCase();
    
    createNativeHost();
    setContextInfo();

    listenPopup();
    
    chrome.tabs.onCreated.addListener(function (tab) {
        if(!tab.url) return; 
        procUrlWithInfo(tab.id,tab.url,Event.create_tab, tab);
    });
    if ("object" == (typeof chrome.webNavigation) && browserType.indexOf("firefox") == -1) {
        chrome.webNavigation.onCommitted.addListener(function (details) {
            procWebNavigation(details);
         });
        chrome.webNavigation.onHistoryStateUpdated.addListener(function (details) {
            procWebNavigation(details);
        });
        chrome.webRequest.onHeadersReceived.addListener(function (details) {
            var requestId = parseInt(details.requestId, 10);
            callNativeHostWithRequestStaus(details.tabId, details.url, details.statusCode, requestId, Event.request_tab, details);
        }, {
            urls: ['<all_urls>'],
         types: ['main_frame']
        }, ['extraHeaders']);
    }

    if (browserType.indexOf("firefox") != -1) {
        consoleLog("initExtension，pop privacy.html");
        setPref(Prop.enable_toast, false);
        chrome.tabs.create({
            url: chrome.runtime.getURL("popup/privacy.html")
        }, function (t) {
            openerTabId = t.id;
            consoleLog("initExtension，openerTabId:" + openerTabId);
        });

        setStatusDisableBrowserAction();
    }

    chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
        if(changeInfo.status == "loading"){
            if(!tab.url) return;
            
            if (browserType.indexOf("firefox") != -1) {
                startAlarm('timer14', 300);
                chrome.alarms.onAlarm.addListener(() => {
                    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                        var currentTab = tabs[0];
                        procUrlWithInfo(currentTab.id,currentTab.url,Event.update_tab, currentTab);
                    });
                    chrome.alarms.clear("timer14");
                });
            } else {
                if (tab.url.search("chrome://*") != -1 || tab.url.search("edge://*") != -1) {
                    procUrlWithInfo(tab.id, tab.url, Event.update_tab, tab);
                } else {
                    procUrlWithOpenerId(tab.id, tab.url, Event.update_tab, tab.openerTabId, tab);
                }
            }
        }
    });
    
    chrome.tabs.onReplaced.addListener(function (addTabId,removeTabId){
        chrome.tabs.get(addTabId,function(tab){
            notifyUpdateTab(addTabId,removeTabId,tab.url,tab.windowId);
        });
    });

    chrome.tabs.onActivated.addListener(function (activeInfo) {
        chrome.tabs.get(activeInfo.tabId,function(tab){
            notifyActiveTab(tab.id, tab.windowId, tab.title);
        });
    });

    chrome.windows.onFocusChanged.addListener(function (windowid) {
        notifyFocusWindow(windowid);
    });

    chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
        procUrl(tabId,0,Event.remove_tab);
    });
    startAlarm('timer15', 500);
    chrome.alarms.onAlarm.addListener(() => {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (installedDetails != null) {
                if (installedDetails.reason == "install") {
                    testNativeHost(Event.installed);
                } else if (installedDetails.reason == "update") {
                }
            }
        });
        chrome.alarms.clear("timer15");
    });
}

function checkCanonicalWebshield(retry) {
    if (compatibleState != CompatibleState.none) {
        return;
    }
    
    retry--;
    consoleLog("checkCanonicalWebshield:" + retry);
        
    if (retry == 0) {
        if (compatibleState == CompatibleState.none) {
            if (browserType.indexOf("firefox") == -1) {
                consoleLog("checkCanonicalWebshield，setUpgradeEnvAction()");
                setUpgradeEnvAction();
            }
        }
    } else {
        // startAlarm('timer16', 1000);
        // chrome.alarms.onAlarm.addListener(() => {
        //     checkCanonicalWebshield(retry);
        //     chrome.alarms.clear("timer16");
        // });
        setTimeout(function() {
            checkCanonicalWebshield(retry);
        }, 1000)
    }
}

function checkPromoPrerequesite(msg) {
    if (msg.status == WebStatus.safe || msg.status == WebStatus.shopping) {
        if (msg.netpay != undefined) { // neypay function turned on
            var request = { type: Request.promo_prerequisite_ok, status: msg.status };
            chrome.tabs.sendMessage(msg.tabid, request).catch(function(e) {
                console.log('Failed to checkPromoPrerequesite, error is ', e)
            })
        }
    }
}

function setOninstalledListener() {
    // ASAP ready for event sent from chrome
    chrome.runtime.onInstalled.addListener(function(details) {
        consoleLog("onInstalled:" + JSON.stringify(details));
        
        installedDetails = details;

    });
}

(function() {
    setOninstalledListener();
    setMessageListener();
    
    chrome.runtime.getPlatformInfo(function(info) {
        consoleLog("checkPlatform:" + JSON.stringify(info));
        
        if (info.os == "win") {
            initExtension();
            
            checkCanonicalWebshield(5);
        } else {
            compatibleState = CompatibleState.unsupported_platform;
            try {
                enableToolIcon(false);
                AntiTrack.settings.setEenabled(false);
            } catch (e) {
                
            }
            chrome.action.setTitle({
                title: chrome.i18n.getMessage('unsupported_platform_message')
            });
        }
    });
})();