var enableAntiTrack = false

var ProductId = {
  "ts": "ts",
  "safe": "safe"
}

function enterNetPayMode(tabId) {
  chrome.runtime.sendMessage({
    type: "enter-net-pay-mode",
    data: {
      tabId: tabId,
    },
  });
}

function exitNetPayMode(tabId) {
  chrome.runtime.sendMessage({
    type: "exit-net-pay-mode",
    data: {
      tabId: tabId,
    },
  });
}

function initTemplateBase(document, msg) {
  if (msg.netpay != undefined) {
    document.getElementById("netpay-mode").textContent = chrome.i18n.getMessage(
      "shopping_protection"
    );
    var netpaySwitch = document.getElementById("netpay-switch");

    if (msg.netpay) {
      netpaySwitch.src = "../images/switch_on.png";

      if (msg.safe != undefined) {
        document.getElementById("security-check-container").style.display =
          "flex";

        securityCheckText = document.getElementById("security-check");
        securityCheckText.textContent =
          chrome.i18n.getMessage("security_check");

        securityStateText = document.getElementById("security-state");
        scanResultImg = document.getElementById("scan-result-img");
        riskProcessedText = document.getElementById("risk-processed");
        if (msg.safe) {
          securityStateText.textContent = chrome.i18n.getMessage("no_risk");
          scanResultImg.src = "../images/icon_checked.png";

          riskProcessedText.style.display = "none";
        } else {
          securityStateText.textContent =
            chrome.i18n.getMessage("risk_detected") + ". ";
          scanResultImg.src = "../images/icon_risky.png";

          riskProcessedText.style.display = "inline";
          riskProcessedText.textContent =
            chrome.i18n.getMessage("Resolved") + "?";
          riskProcessedText.onclick = function (e) {
            var msg = [{
              event: Event.risk_processed,
            }, ];
            port.postMessage(msg);

            riskProcessedText.style.display = "none";
            securityStateText.textContent = chrome.i18n.getMessage("no_risk");
            scanResultImg.src = "../images/icon_checked.png";
          };
        }
      } else {
        if (enableAntiTrack) {
          scanStatusImg = document.getElementById("large_icon");
          if (scanStatusImg != null)
            scanStatusImg.src = "../images/antitrack_large.png";
        }
      }
    } else {
      if (enableAntiTrack) {
        scanStatusImg = document.getElementById("large_icon");
        if (scanStatusImg != null)
          scanStatusImg.src = "../images/antitrack_large.png";
      }

      netpaySwitch.src = "../images/switch_off.png";
      document.getElementById("misc-pannel").style.display = "none";
    }

    netpaySwitch.onclick = function () {
      document.getElementById("security-check-container").style.display =
        "none";

      var miscPannel = document.getElementById("misc-pannel");
      if (msg.netpay) {
        miscPannel.style.display = "none";
        this.src = "../images/switch_off.png";

        exitNetPayMode(msg.tabid);
      } else {
        miscPannel.style.display = "block";
        this.src = "../images/switch_on.png";

        enterNetPayMode(msg.tabid);
      }
    };
  } else {
    document.getElementById("netpay-pannel").style.display = "none";
    document.getElementById("misc-pannel").style.display = "none";
  }
}
