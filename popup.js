document.addEventListener('DOMContentLoaded', function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        const tab = tabs[0];
        if (!tab.url || tab.url.startsWith('chrome://')) {
            document.getElementById('cookies-container').textContent = '无法读取此页面的Cookies';
            return;
        }

        const container = document.getElementById('cookies-container');
        const domain = new URL(tab.url).hostname;
        
        // 使用多种方法获取cookies，包括能获取到cf_clearance的方法
        getAllRelevantCookies(tab.url, domain, function(allCookies) {
            if (allCookies && allCookies.length > 0) {
                // 去重 - 根据name+domain+path组合去重
                const uniqueCookies = [];
                const seen = new Set();
                
                allCookies.forEach(cookie => {
                    const key = `${cookie.name}|${cookie.domain}|${cookie.path}`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        uniqueCookies.push(cookie);
                    }
                });
                
                // 按重要性排序：cf_clearance优先，然后按字母顺序
                const sortedCookies = uniqueCookies.sort((a, b) => {
                    if (a.name === 'cf_clearance' && b.name !== 'cf_clearance') return -1;
                    if (b.name === 'cf_clearance' && a.name !== 'cf_clearance') return 1;
                    return a.name.localeCompare(b.name);
                });
                
                let cfClearanceFound = false;
                
                // 显示所有cookies
                sortedCookies.forEach((cookie, index) => {
                    const cookieElement = document.createElement('div');
                    cookieElement.className = 'cookie-item';
                    
                    // 检测到cf_clearance记录状态，但显示方式与普通cookie相同
                    if (cookie.name === 'cf_clearance') {
                        cfClearanceFound = true;
                    }
                    
                    // 统一的cookie显示方式
                    const nameSpan = document.createElement('span');
                    nameSpan.className = 'cookie-name';
                    nameSpan.textContent = cookie.name;
                    
                    const valueSpan = document.createElement('span');
                    valueSpan.className = 'cookie-value';
                    valueSpan.textContent = `=${cookie.value}`;
                    
                    // 如果不是当前域名的cookie，显示域名信息
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
                
                // 如果没有找到cf_clearance，显示提示
                if (!cfClearanceFound) {
                    const noticElement = document.createElement('div');
                    noticElement.className = 'notice';
                    noticElement.textContent = '未检测到 cf_clearance Cookie - 此网站可能未使用Cloudflare保护';
                    container.insertBefore(noticElement, container.firstChild);
                }
                
                // 显示统计信息
                const statsDiv = document.createElement('div');
                statsDiv.className = 'stats';
                statsDiv.textContent = `共找到 ${sortedCookies.length} 个Cookie${cfClearanceFound ? ' (包含cf_clearance)' : ''}`;
                container.appendChild(statsDiv);
                
            } else {
                container.textContent = '未找到Cookies';
            }
        });
    });

    // 检查cookie是否真正适用于当前页面
    function isCookieValidForCurrentPage(cookie, currentDomain, currentUrl) {
        // 检查cookie的域名是否适用于当前页面
        const cookieDomain = cookie.domain;
        
        // 如果cookie域名以.开头，它适用于该域名及其所有子域名
        if (cookieDomain.startsWith('.')) {
            const baseDomain = cookieDomain.substring(1);
            // 当前域名必须是该域名或其子域名
            return currentDomain === baseDomain || currentDomain.endsWith('.' + baseDomain);
        } else {
            // 如果cookie域名不以.开头，它只适用于确切的域名
            return currentDomain === cookieDomain;
        }
    }

    // 获取所有相关cookies的函数 - 使用精准匹配逻辑
    function getAllRelevantCookies(url, domain, callback) {
        const allCookies = [];
        let completed = 0;
        const methods = 3; // 简化为3种主要方法
        
        // 方法1: 直接使用URL获取 (最精准的方法)
        chrome.cookies.getAll({ url: url }, function(cookies1) {
            if (cookies1) {
                // 过滤出真正适用于当前页面的cookies
                const validCookies = cookies1.filter(cookie => 
                    isCookieValidForCurrentPage(cookie, domain, url)
                );
                allCookies.push(...validCookies);
            }
            completed++;
            if (completed === methods) callback(allCookies);
        });
        
        // 方法2: 获取当前确切域名的cookies
        chrome.cookies.getAll({ domain: domain }, function(cookies2) {
            if (cookies2) {
                // 只保留确切匹配的cookies
                const validCookies = cookies2.filter(cookie => 
                    isCookieValidForCurrentPage(cookie, domain, url)
                );
                allCookies.push(...validCookies);
            }
            completed++;
            if (completed === methods) callback(allCookies);
        });
        
        // 方法3: 获取父域名的cookies（以.开头的）
        chrome.cookies.getAll({ domain: '.' + domain }, function(cookies3) {
            if (cookies3) {
                // 只保留真正适用于当前域名的cookies
                const validCookies = cookies3.filter(cookie => 
                    isCookieValidForCurrentPage(cookie, domain, url)
                );
                allCookies.push(...validCookies);
            }
            completed++;
            if (completed === methods) callback(allCookies);
        });
    }

    // 复制全部功能
    document.getElementById('copy-all').addEventListener('click', function() {
        const cookieItems = document.querySelectorAll('.cookie-item');
        const cookies = Array.from(cookieItems).map(el => {
            return el.textContent.replace(/\s+\([^)]+\)$/, ''); // 移除域名信息
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