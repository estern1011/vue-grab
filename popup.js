const toggleBtn = document.getElementById('toggleBtn');
const statusDiv = document.getElementById('status');

// Check current state when popup opens
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  chrome.tabs.sendMessage(
    tabs[0].id,
    { action: 'getState' },
    (response) => {
      if (response && response.isActive) {
        updateUI(true);
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
          updateUI(response.isActive);
          
          // Close popup after activating
          if (response.isActive) {
            setTimeout(() => window.close(), 500);
          }
        }
      }
    );
  });
});

function updateUI(isActive) {
  if (isActive) {
    toggleBtn.textContent = 'Stop Grabbing';
    toggleBtn.classList.add('active');
    statusDiv.textContent = '✓ Active - Click any element';
    statusDiv.className = 'status active';
  } else {
    toggleBtn.textContent = 'Start Grabbing';
    toggleBtn.classList.remove('active');
    statusDiv.textContent = 'Click the button to activate';
    statusDiv.className = 'status inactive';
  }
}
