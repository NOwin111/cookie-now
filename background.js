chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.tabId) {
        chrome.tabs.get(request.tabId, function(tab) {
            if (tab.url?.startsWith("chrome://")) {
                sendResponse({ cookies: [] });
                return;
            }
            
            chrome.cookies.getAll({ url: tab.url }, function(cookies) {
                sendResponse({ cookies: cookies });
            });
        });
        return true; 
    }
});