const toggleBtn = document.getElementById('toggleBtn');
const cursorBtn = document.getElementById('cursorBtn');
const statusDiv = document.getElementById('status');

// Check current state when popup opens
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  chrome.tabs.sendMessage(
    tabs[0].id,
    { action: 'getState' },
    (response) => {
      if (response) {
        updateUI(response.isActive, response.hasData);
      }
    }
  );
});

toggleBtn.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(
      tabs[0].id,
      { action: 'toggle' },
      (response) => {
        if (response) {
          updateUI(response.isActive, false);

          // Close popup after activating
          if (response.isActive) {
            setTimeout(() => window.close(), 500);
          }
        }
      }
    );
  });
});

cursorBtn.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(
      tabs[0].id,
      { action: 'getLastData' },
      (response) => {
        if (response && response.data) {
          downloadToCursorFolder(response.data);
        }
      }
    );
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
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: 'sendToCursor' },
        (response) => {
          if (response && response.success) {
            statusDiv.textContent = '✓ Downloading context file...';
            statusDiv.className = 'status active';
          } else {
            statusDiv.textContent = '✗ Failed to send to Cursor';
            statusDiv.className = 'status inactive';
          }
        }
      );
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
