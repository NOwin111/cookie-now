document.addEventListener('DOMContentLoaded', function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        const tab = tabs[0];
        if (!tab.url || tab.url.startsWith('chrome://')) {
            document.getElementById('cookies-container').textContent = '无法读取此页面的Cookies';
            return;
        }

        const container = document.getElementById('cookies-container');
        const domain = new URL(tab.url).hostname;
        
        getAllRelevantCookies(tab.url, domain, function(allCookies) {
            if (allCookies && allCookies.length > 0) {
                const uniqueCookies = [];
                const seen = new Set();
                
                allCookies.forEach(cookie => {
                    const key = `${cookie.name}|${cookie.domain}|${cookie.path}`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        uniqueCookies.push(cookie);
                    }
                });
                
                const sortedCookies = uniqueCookies.sort((a, b) => {
                    if (a.name === 'cf_clearance' && b.name !== 'cf_clearance') return 1;
                    if (b.name === 'cf_clearance' && a.name !== 'cf_clearance') return -1;
                    return a.name.localeCompare(b.name);
                });
                
                let cfClearanceFound = false;
                
                sortedCookies.forEach((cookie, index) => {
                    const cookieElement = document.createElement('div');
                    cookieElement.className = 'cookie-item';
                    
                    if (cookie.name === 'cf_clearance') {
                        cfClearanceFound = true;
                    }
                    
                    const nameSpan = document.createElement('span');
                    nameSpan.className = 'cookie-name';
                    nameSpan.textContent = cookie.name;
                    
                    const valueSpan = document.createElement('span');
                    valueSpan.className = 'cookie-value';
                    valueSpan.textContent = `=${cookie.value}`;
                    
                    if (cookie.domain !== domain && cookie.domain !== '.' + domain) {
                        const domainSpan = document.createElement('span');
                        domainSpan.className = 'cookie-domain';
                        domainSpan.textContent = ` (${cookie.domain})`;
                        cookieElement.appendChild(nameSpan);
                        cookieElement.appendChild(valueSpan);
                        cookieElement.appendChild(domainSpan);
                    } else {
                        cookieElement.appendChild(nameSpan);
                        cookieElement.appendChild(valueSpan);
                    }
                    
                    container.appendChild(cookieElement);
                });
                
                if (!cfClearanceFound) {
                    const noticElement = document.createElement('div');
                    noticElement.className = 'notice';
                    noticElement.textContent = '未检测到 cf_clearance Cookie - 此网站可能未使用Cloudflare保护';
                    container.insertBefore(noticElement, container.firstChild);
                }
                
                const statsDiv = document.createElement('div');
                statsDiv.className = 'stats';
                statsDiv.textContent = `共找到 ${sortedCookies.length} 个Cookie${cfClearanceFound ? ' (包含cf_clearance)' : ''}`;
                container.appendChild(statsDiv);
                
            } else {
                container.textContent = '未找到Cookies';
            }
        });
    });

    function isCookieValidForCurrentPage(cookie, currentDomain, currentUrl) {
        const cookieDomain = cookie.domain;
        
        if (cookieDomain.startsWith('.')) {
            const baseDomain = cookieDomain.substring(1);
            return currentDomain === baseDomain || currentDomain.endsWith('.' + baseDomain);
        } else {
            return currentDomain === cookieDomain;
        }
    }

    function getAllRelevantCookies(url, domain, callback) {
        const allCookies = [];
        let completed = 0;
        const methods = 3;
        
        chrome.cookies.getAll({ url: url }, function(cookies1) {
            if (cookies1) {
                const validCookies = cookies1.filter(cookie => 
                    isCookieValidForCurrentPage(cookie, domain, url)
                );
                allCookies.push(...validCookies);
            }
            completed++;
            if (completed === methods) callback(allCookies);
        });
        
        chrome.cookies.getAll({ domain: domain }, function(cookies2) {
            if (cookies2) {
                const validCookies = cookies2.filter(cookie => 
                    isCookieValidForCurrentPage(cookie, domain, url)
                );
                allCookies.push(...validCookies);
            }
            completed++;
            if (completed === methods) callback(allCookies);
        });
        
        chrome.cookies.getAll({ domain: '.' + domain }, function(cookies3) {
            if (cookies3) {
                const validCookies = cookies3.filter(cookie => 
                    isCookieValidForCurrentPage(cookie, domain, url)
                );
                allCookies.push(...validCookies);
            }
            completed++;
            if (completed === methods) callback(allCookies);
        });
    }

    document.getElementById('copy-all').addEventListener('click', function() {
        const cookieItems = document.querySelectorAll('.cookie-item');
        const cookies = Array.from(cookieItems).map(el => {
            return el.textContent.replace(/\s+\([^)]+\)$/, '');
        }).join('; ');
        
        navigator.clipboard.writeText(cookies).then(() => {
            const button = document.getElementById('copy-all');
            const originalText = button.textContent;
            button.textContent = '✅ 已复制!';
            setTimeout(() => {
                button.textContent = originalText;
            }, 2000);
        });
    });
});