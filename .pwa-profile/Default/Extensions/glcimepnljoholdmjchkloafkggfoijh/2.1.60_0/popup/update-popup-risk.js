function updatePopup(document, msg) {
    document.getElementById('status-text').textContent = chrome.i18n.getMessage('risk_website');
    document.getElementById('status-desc').textContent = chrome.i18n.getMessage('risk_desc');
    
    closeButton = document.getElementById('close-tab');
    closeButton.textContent = chrome.i18n.getMessage('close');
    closeButton.onclick = function() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            var currentTab = tabs[0];
            consoleLog("callback:" + JSON.stringify(currentTab));      
            chrome.tabs.remove([currentTab.id]);
        });
    };
    
    reportText = document.getElementById('report-false-positive');
    reportText.textContent = chrome.i18n.getMessage('report_false_positive');
    reportText.onclick = function() {
        chrome.tabs.create({url: getReportFalsePositiveUrl(msg.productId)});
    };
}
