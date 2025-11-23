const toggleBtn = document.getElementById('toggleBtn');
const cursorBtn = document.getElementById('cursorBtn');
const statusDiv = document.getElementById('status');

// Helper to safely send messages to content script with error handling
function sendMessageToTab(action, callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    // Validate we have a tab
    if (!tabs || !tabs[0] || !tabs[0].id) {
      showError('No active tab found');
      return;
    }

    const tab = tabs[0];

    // Check if this is a page where content scripts can't run
    if (tab.url && (
      tab.url.startsWith('chrome://') ||
      tab.url.startsWith('chrome-extension://') ||
      tab.url.startsWith('about:') ||
      tab.url.startsWith('edge://') ||
      tab.url.startsWith('devtools://') ||
      tab.url === 'about:blank'
    )) {
      showError('Cannot run on browser internal pages');
      return;
    }

    chrome.tabs.sendMessage(tab.id, { action }, (response) => {
      // Check for connection errors
      if (chrome.runtime.lastError) {
        console.error('Connection error:', chrome.runtime.lastError.message);
        showError('Content script not loaded. Try refreshing the page.');
        return;
      }

      if (callback) {
        callback(response);
      }
    });
  });
}

function showError(message) {
  statusDiv.textContent = '⚠ ' + message;
  statusDiv.className = 'status error';
  toggleBtn.disabled = true;
  toggleBtn.textContent = 'Not Available';
}

// Check current state when popup opens
sendMessageToTab('getState', (response) => {
  if (response) {
    updateUI(response.isActive, response.hasData);
  }
});

toggleBtn.addEventListener('click', () => {
  if (toggleBtn.disabled) return;

  sendMessageToTab('toggle', (response) => {
    if (response) {
      updateUI(response.isActive, false);

      // Close popup after activating
      if (response.isActive) {
        setTimeout(() => window.close(), 500);
      }
    }
  });
});

cursorBtn.addEventListener('click', () => {
  sendMessageToTab('getLastData', (response) => {
    if (response && response.data) {
      downloadToCursorFolder(response.data);
    }
  });
});

// Listen for download requests from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'downloadFile') {
    downloadToCursorFolder({ content: request.content, filename: request.filename });
  }
});

function downloadToCursorFolder(data) {
  // Format the data if it's a component object
  let content = data.content;
  if (!content && data.componentName) {
    // This is a component data object, we need to format it
    // Since we don't have access to formatForClaudeCCode here, we'll send a message
    sendMessageToTab('sendToCursor', (response) => {
      if (response && response.success) {
        statusDiv.textContent = '✓ Downloading context file...';
        statusDiv.className = 'status active';
      } else {
        statusDiv.textContent = '✗ Failed to send to Cursor';
        statusDiv.className = 'status inactive';
      }
    });
    return;
  }

  // Create download
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);

  chrome.downloads.download({
    url: url,
    filename: '.cursor/context/vue-grab-latest.md',
    saveAs: false
  }, (downloadId) => {
    if (chrome.runtime.lastError) {
      console.error('Download error:', chrome.runtime.lastError);
      statusDiv.textContent = '✗ Download failed - check permissions';
      statusDiv.className = 'status inactive';
    } else {
      statusDiv.textContent = '✓ Saved to .cursor/context/';
      statusDiv.className = 'status active';
      setTimeout(() => window.close(), 2000);
    }
    URL.revokeObjectURL(url);
  });
}

function updateUI(isActive, hasData) {
  toggleBtn.disabled = false;

  if (isActive) {
    toggleBtn.textContent = 'Stop Grabbing';
    toggleBtn.classList.add('active');
    statusDiv.textContent = '✓ Active - Click any element';
    statusDiv.className = 'status active';
    cursorBtn.style.display = 'none';
  } else {
    toggleBtn.textContent = 'Start Grabbing';
    toggleBtn.classList.remove('active');
    statusDiv.textContent = 'Click the button to activate';
    statusDiv.className = 'status inactive';

    // Show cursor button if we have data
    if (hasData) {
      cursorBtn.style.display = 'block';
    } else {
      cursorBtn.style.display = 'none';
    }
  }
}
