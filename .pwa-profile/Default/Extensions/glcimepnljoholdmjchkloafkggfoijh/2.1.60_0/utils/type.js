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