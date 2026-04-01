/**
 * Vue Grab - Background Service Worker
 *
 * Handles keyboard shortcut commands to toggle grab mode.
 */

chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-grab') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) return;

      // Don't run on browser internal pages
      if (tab.url && (
        tab.url.startsWith('chrome://') ||
        tab.url.startsWith('chrome-extension://') ||
        tab.url.startsWith('about:') ||
        tab.url.startsWith('edge://') ||
        tab.url.startsWith('devtools://')
      )) return;

      chrome.tabs.sendMessage(tab.id, { action: 'toggle' });
    });
  }
});
