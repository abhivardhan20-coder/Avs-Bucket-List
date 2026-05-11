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