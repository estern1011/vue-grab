// Background service worker for Vue Grab extension
// Handles downloads and deep linking to Cursor Composer

// Listen for download requests from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'downloadFile') {
    handleDownload(request.content, request.filename)
      .then(result => sendResponse({ success: true, ...result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep the message channel open for async response
  }

  if (request.action === 'openCursor') {
    handleCursorDeepLink(request.filePath, request.content)
      .then(result => sendResponse({ success: true, ...result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'getDownloadPath') {
    getDownloadPath()
      .then(path => sendResponse({ success: true, path }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Handle file download to .cursor/context/ folder
async function handleDownload(content, filename = 'vue-grab-latest.md') {
  try {
    // Create blob and object URL
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);

    // Start download
    const downloadId = await chrome.downloads.download({
      url: url,
      filename: `.cursor/context/${filename}`,
      saveAs: false, // Don't prompt, save directly
      conflictAction: 'overwrite' // Overwrite existing file
    });

    // Clean up object URL after a delay
    setTimeout(() => URL.revokeObjectURL(url), 10000);

    // Monitor download progress
    return new Promise((resolve, reject) => {
      const listener = (delta) => {
        if (delta.id !== downloadId) return;

        if (delta.state && delta.state.current === 'complete') {
          chrome.downloads.onChanged.removeListener(listener);
          resolve({ downloadId, message: 'File saved successfully' });
        } else if (delta.error) {
          chrome.downloads.onChanged.removeListener(listener);
          reject(new Error(delta.error.current));
        }
      };

      chrome.downloads.onChanged.addListener(listener);

      // Timeout after 30 seconds
      setTimeout(() => {
        chrome.downloads.onChanged.removeListener(listener);
        reject(new Error('Download timeout'));
      }, 30000);
    });
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
}

// Handle Cursor deep linking
async function handleCursorDeepLink(filePath, content) {
  try {
    // First, save the file
    await handleDownload(content, 'vue-grab-latest.md');

    // Try to open Cursor using deep link protocol
    // Note: This may not work without proper protocol handler setup
    const encodedPath = encodeURIComponent(filePath || '');
    const cursorUrl = `cursor://file/${encodedPath}?composer=true`;

    // Try to create a new tab with the cursor:// protocol
    // This will only work if Cursor is installed and protocol handler is registered
    try {
      await chrome.tabs.create({ url: cursorUrl, active: false });
      // Close the tab immediately if it opened (protocol handlers usually don't render)
      setTimeout(async () => {
        const tabs = await chrome.tabs.query({ url: cursorUrl });
        tabs.forEach(tab => chrome.tabs.remove(tab.id));
      }, 1000);

      return { message: 'Opened in Cursor (if installed)' };
    } catch (e) {
      // Protocol handler not available
      return { message: 'File saved. Open Cursor manually to see context.' };
    }
  } catch (error) {
    console.error('Cursor deep link error:', error);
    throw error;
  }
}

// Get the default download path
async function getDownloadPath() {
  try {
    // Try to get download path from Chrome settings
    // This is not directly accessible, so we return a helpful message
    return 'Downloads/.cursor/context/';
  } catch (error) {
    console.error('Error getting download path:', error);
    throw error;
  }
}

// Handle installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Vue Grab extension installed!');

    // Optionally open a welcome page
    // chrome.tabs.create({ url: 'welcome.html' });
  } else if (details.reason === 'update') {
    console.log('Vue Grab extension updated to version', chrome.runtime.getManifest().version);
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  // This will only fire if there's no popup defined
  // Since we have a popup, this won't normally be called
  console.log('Extension icon clicked on tab:', tab.id);
});

// Monitor download completion and show notification
chrome.downloads.onChanged.addListener((delta) => {
  if (delta.state && delta.state.current === 'complete') {
    // Check if this is a vue-grab download
    chrome.downloads.search({ id: delta.id }, (results) => {
      if (results.length > 0 && results[0].filename.includes('.cursor/context/')) {
        // Show notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.svg',
          title: 'Vue Grab',
          message: 'Component context saved to .cursor/context/',
          priority: 1
        });
      }
    });
  }
});

console.log('Vue Grab background service worker loaded');
