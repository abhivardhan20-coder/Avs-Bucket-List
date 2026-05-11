var promoEnabled = null;

document.getElementById('pri-statements').onclick = function () {
    var url = 'https://addons.mozilla.org/en-US/firefox/addon/360-internet-protection/privacy/';
    window.open(url);
}
document.getElementById('pri-btn-accept').onclick = function () {
    setPref(Prop.enable_toast, true);
    chrome.runtime.sendMessage({ text: Request.enable_toolbar_icon_status, state: true }, function (response) {
    });
    chrome.runtime.sendMessage({ text: Request.popup_privacy_page_agree, state: 1 }, function (response) {
    });
    window.close();
}
document.getElementById('pri-btn-decline').onclick = function () {
    setPref(Prop.enable_toast, false);
    setPref(promoEnabled, false);
    chrome.runtime.sendMessage({ text: Request.enable_toolbar_icon_status, state: false }, function (response) {
    });
    window.close();
}

function initLayout() {
    document.getElementById("ext-name").textContent = chrome.i18n.getMessage('extension_name');
    document.getElementById("pri-page-title").textContent = chrome.i18n.getMessage('privacy_page_title');
    document.getElementById("pri-page-detail").textContent = chrome.i18n.getMessage('privacy_page_details');
    document.getElementById("pri-page-statements").textContent = chrome.i18n.getMessage('privacy_page_statements');
    document.getElementById("pri-statements").textContent = chrome.i18n.getMessage('privacy_statement');
    document.getElementById("pri-page-refuse").textContent = chrome.i18n.getMessage('privacy_page_refuse');
    document.getElementById("pri-btn-accept").textContent = chrome.i18n.getMessage('privacy_button_accept');
    document.getElementById("pri-btn-decline").textContent = chrome.i18n.getMessage('privacy_button_decline');
}

function checkResponse(retry) {
    chrome.runtime.sendMessage({ text: Request.get_product_id }, function (response) {
        retry--;
        consoleLog("checkResponse -> retry:" + retry);
        if (response == undefined) {
            if (retry == 0) {

            } else {
                setTimeout(function () {
                    checkResponse(retry);
                }, 100);
            }
            return;
        }
        consoleLog("checkResponse -> response:" + JSON.stringify(response));
    });
}

document.addEventListener("DOMContentLoaded", function () {
    initLayout();
    setTimeout(function () {
        checkResponse(10);
    }, 300); // time to confirm CompatibleState.enable_siteaccess 
});
