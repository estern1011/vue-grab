const toggleBtn = document.getElementById('toggleBtn');
const saveBtn = document.getElementById('saveBtn');
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

saveBtn.addEventListener('click', () => {
  sendMessageToTab('getLastData', (response) => {
    if (response && response.data) {
      downloadContextFile(response.data);
    }
  });
});

// Listen for download requests from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'downloadFile') {
    downloadContextFile({ content: request.content, filename: request.filename });
  }
});

function downloadContextFile(data) {
  // Format the data if it's a component object
  let content = data.content;
  if (!content && data.componentName) {
    // This is a component data object, we need to format it
    sendMessageToTab('formatAndDownload', (response) => {
      if (response && response.success) {
        statusDiv.textContent = '✓ Downloading...';
        statusDiv.className = 'status active';
      } else {
        statusDiv.textContent = '✗ Download failed';
        statusDiv.className = 'status inactive';
      }
    });
    return;
  }

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = data.filename || `vue-component-${timestamp}.md`;

  // Create download
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);

  chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: true  // Let user choose location
  }, (downloadId) => {
    if (chrome.runtime.lastError) {
      console.error('Download error:', chrome.runtime.lastError);
      statusDiv.textContent = '✗ Download failed - check permissions';
      statusDiv.className = 'status inactive';
    } else {
      statusDiv.textContent = '✓ File saved!';
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
    saveBtn.style.display = 'none';
  } else {
    toggleBtn.textContent = 'Start Grabbing';
    toggleBtn.classList.remove('active');
    statusDiv.textContent = 'Click the button to activate';
    statusDiv.className = 'status inactive';

    // Show save button if we have data
    if (hasData) {
      saveBtn.style.display = 'block';
    } else {
      saveBtn.style.display = 'none';
    }
  }
}
