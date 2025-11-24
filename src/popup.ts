import type { ComponentData, ContentScriptResponse } from './types';

// Access constants from window object (loaded from constants.js)
const VUE_GRAB_IDE_CONFIG = window.VUE_GRAB_IDE_CONFIG;

const toggleBtn = document.getElementById('toggleBtn') as HTMLButtonElement;
const ideSection = document.getElementById('ideSection') as HTMLDivElement;
const ideSelect = document.getElementById('ideSelect') as HTMLSelectElement;
const openIdeBtn = document.getElementById('openIdeBtn') as HTMLButtonElement;
const statusDiv = document.getElementById('status') as HTMLDivElement;

// Store the last component data for IDE opening
let lastComponentFilePath: string | null = null;

// Load saved editor preference
chrome.storage.local.get(['selectedEditor'], (result) => {
  if (result.selectedEditor) {
    ideSelect.value = result.selectedEditor as string;
  }
});

// Save editor preference when changed
ideSelect.addEventListener('change', () => {
  const selectedEditor = ideSelect.value;

  // Save to storage
  chrome.storage.local.set({ selectedEditor });

  // Notify content script of the change
  sendMessageToTab('setEditor', null, { editor: selectedEditor });
});

// Helper to safely send messages to content script with error handling
function sendMessageToTab(
  action: string,
  callback: ((response: ContentScriptResponse) => void) | null,
  extraData: Record<string, any> = {}
): void {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    // Validate we have a tab
    if (!tabs || !tabs[0] || !tabs[0].id) {
      if (callback) showError('No active tab found');
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
      if (callback) showError('Cannot run on browser internal pages');
      return;
    }

    chrome.tabs.sendMessage(tab.id, { action, ...extraData }, (response: ContentScriptResponse) => {
      // Check for connection errors
      if (chrome.runtime.lastError) {
        console.error('Connection error:', chrome.runtime.lastError.message);
        if (callback) showError('Content script not loaded. Try refreshing the page.');
        return;
      }

      if (callback) {
        callback(response);
      }
    });
  });
}

function showError(message: string): void {
  statusDiv.textContent = '⚠ ' + message;
  statusDiv.className = 'status error';
  toggleBtn.disabled = true;
  toggleBtn.textContent = 'Not Available';
}

// Check current state when popup opens
sendMessageToTab('getState', (response) => {
  if (response) {
    updateUI(response.isActive ?? false, response.hasData ?? false);

    // If we have data, get the file path for IDE opening
    if (response.hasData) {
      sendMessageToTab('getLastData', (dataResponse) => {
        if (dataResponse && dataResponse.data) {
          lastComponentFilePath = dataResponse.data.filePath;
        }
      });
    }
  }
});

toggleBtn.addEventListener('click', () => {
  if (toggleBtn.disabled) return;

  sendMessageToTab('toggle', (response) => {
    if (response) {
      updateUI(response.isActive ?? false, false);

      // Close popup after activating
      if (response.isActive) {
        setTimeout(() => window.close(), 500);
      }
    }
  });
});

openIdeBtn.addEventListener('click', () => {
  const selectedIde = ideSelect.value;
  const config = VUE_GRAB_IDE_CONFIG[selectedIde];

  if (!config) {
    statusDiv.textContent = '✗ Unknown IDE selected';
    statusDiv.className = 'status error';
    return;
  }

  // Get the latest data to ensure we have the file path
  sendMessageToTab('getLastData', (response) => {
    if (response && response.data) {
      const filePath = response.data.filePath;
      const url = config.buildUrl(filePath || '');

      try {
        // Try to open the IDE with the file
        window.open(url, '_blank');
        statusDiv.textContent = `✓ Opening in ${config.name}...`;
        statusDiv.className = 'status active';

        // Close popup after a short delay
        setTimeout(() => window.close(), 1500);
      } catch (e) {
        console.error('Failed to open IDE:', e);
        statusDiv.textContent = `✗ Could not open ${config.name}. Is it installed?`;
        statusDiv.className = 'status error';
      }
    } else {
      statusDiv.textContent = '✗ No component data available';
      statusDiv.className = 'status error';
    }
  });
});

// Listen for download requests from content script (not used currently but kept for compatibility)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'downloadFile') {
    // Could add download functionality here if needed
  }
});

function updateUI(isActive: boolean, hasData: boolean): void {
  toggleBtn.disabled = false;

  if (isActive) {
    toggleBtn.textContent = 'Stop Grabbing';
    toggleBtn.classList.add('active');
    statusDiv.textContent = '✓ Active - Click any element';
    statusDiv.className = 'status active';
    ideSection.classList.remove('visible');
  } else {
    toggleBtn.textContent = 'Start Grabbing';
    toggleBtn.classList.remove('active');
    statusDiv.textContent = 'Click the button to activate';
    statusDiv.className = 'status inactive';

    // Show IDE section if we have data
    if (hasData) {
      ideSection.classList.add('visible');
      statusDiv.textContent = '✓ Data copied! Open in IDE or paste anywhere.';
      statusDiv.className = 'status active';
    } else {
      ideSection.classList.remove('visible');
    }
  }
}
