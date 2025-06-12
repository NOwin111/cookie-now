chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.tabId) {
        chrome.tabs.get(request.tabId, function(tab) {
            // 跳过 chrome:// 等特殊URL
            if (tab.url?.startsWith("chrome://")) {
                return false;
            }
            
            // 只获取cookies，不再获取storage
            chrome.cookies.getAll({ url: tab.url }, function(cookies) {
                sendResponse({ cookies: cookies });
            });
        });
    }
    return true;
});