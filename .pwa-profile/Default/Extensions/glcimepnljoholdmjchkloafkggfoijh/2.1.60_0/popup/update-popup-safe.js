function updatePopup(document, msg) {
    initTemplateBase(document, msg);

    if(enableAntiTrack)
        document.getElementById('status-text').textContent = chrome.i18n.getMessage('safe_website_antitrack');
    else   
        document.getElementById('status-text').textContent = chrome.i18n.getMessage('safe_website');

    document.getElementById('enhance-text').textContent = chrome.i18n.getMessage('enhanced');
    
    if (msg.netpay == undefined) {
        document.getElementById('enhance-pannel').style.display = 'none';
        document.getElementById('status-desc').style.display = 'flex'; 
        document.getElementById('status-desc').textContent = getEnableShoppingProtectionDesc(msg.productId);
    }

    if(enableAntiTrack)
    {
        document.getElementById('status-desc').style.display = 'flex';
        document.getElementById('status-desc').textContent = chrome.i18n.getMessage('safe_website_desc');
    }
}