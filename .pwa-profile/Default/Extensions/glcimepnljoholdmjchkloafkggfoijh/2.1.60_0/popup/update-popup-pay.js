function updatePopup(document, msg) {
    initTemplateBase(document, msg);
    
    if (msg.name != undefined) {
        document.getElementById('website-name-container').style.display = 'flex';
        document.getElementById('website').textContent = chrome.i18n.getMessage('website');
        document.getElementById('website-name').textContent = msg.name;
        
        document.getElementById('website-description-container').style.display = 'flex';
        document.getElementById('website-status').textContent = chrome.i18n.getMessage('status');
        document.getElementById('website-official').textContent = chrome.i18n.getMessage('official');
        document.getElementById('website-safe').textContent = chrome.i18n.getMessage('safe');
    }
    
    var statusText = document.getElementById('status-text');
    var statusDesc = document.getElementById('status-desc');
    
    if (msg.netpay != undefined) {
        var miscPannel = document.getElementById('misc-pannel');
        var shoppingImg = document.getElementById('shopping-icon-large');
        
        statusText.textContent = chrome.i18n.getMessage('shopping_website');
        
        if( msg.netpay == 0) {
            miscPannel.style.display = 'none';
            shoppingImg.src  = "../images/shopping_exit_large.png";
            statusDesc.textContent = chrome.i18n.getMessage('shopping_protection_exit_desc');
        } else {
            miscPannel.style.display = 'block';
            shoppingImg.src  = "../images/shopping_large.png";

            if(enableAntiTrack)
                statusDesc.textContent = chrome.i18n.getMessage('shopping_desc_antitrack');
            else
                statusDesc.textContent = chrome.i18n.getMessage('shopping_desc');
        }
    } else { // disabled by ts/360safe
        statusText.textContent = chrome.i18n.getMessage('shopping_website_off');
        statusDesc.textContent = getEnableShoppingProtectionDesc(msg.productId);
        
        document.getElementById('netpay-pannel').style.display = 'none';
        document.getElementById('misc-pannel').style.display = 'none';
        document.getElementById('shopping-icon-large').src= "../images/shopping_exit_large.png";
    }
}