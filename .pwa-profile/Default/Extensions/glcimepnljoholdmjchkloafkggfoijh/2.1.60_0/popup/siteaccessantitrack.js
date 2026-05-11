document.addEventListener("DOMContentLoaded", function() {
    document.getElementById('status-text').textContent = chrome.i18n.getMessage('enableantitrack_tips');

    chrome.runtime.sendMessage({ text: Request.get_product_id }, function(response) {
        document.getElementById('status-text1').textContent = getEnableWebProtectionDesc(response);
    });
});