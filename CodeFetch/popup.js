chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'assets') {
    const ul = document.getElementById('assetList');
    ul.innerHTML = '';
    msg.data.forEach(url => {
      const li = document.createElement('li');
      li.textContent = url;
      ul.appendChild(li);
    });
  }
});



document.addEventListener('DOMContentLoaded', () => {


    document.getElementById('getCssBtn').addEventListener('click', async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    window.cssInspectorActive = true;
                    document.dispatchEvent(new CustomEvent('cssInspectorActivate'));
                }
            });
            
            window.close();
        } catch (error) {
            console.error('Error activating CSS inspector:', error);
        }
    });


    const assetsBtn = document.getElementById('assetsBtn');

    assetsBtn.addEventListener('click', function() {
        // Get current active tab
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            // Send message to content script to extract assets
            chrome.tabs.sendMessage(tabs[0].id, {action: "extractAssets"}, function(response) {
                if (response && response.assets) {
                    // Open assets window and close popup
                    openAssetsWindow(response.assets);
                } else {
                    console.error('Failed to extract assets');
                    // Still close popup even if extraction failed
                    window.close();
                }
            });
        });
    });

    function openAssetsWindow(assets) {
        // Store assets data
        chrome.storage.local.set({currentAssets: assets}, function() {
            // Open assets viewer as a popup window
            chrome.windows.create({
                url: chrome.runtime.getURL('/assets.html'),
                type: 'popup',
                width: 1000,
                height: 700,
                focused: true
            }, function(window) {
                // Close the extension popup
                self.close();
            });
        });
    }
});