/**
 * Vue Grab - Content Script
 *
 * This is the main content script that runs in the extension's isolated world.
 * It handles all UI elements and user interaction.
 *
 * Features:
 * - Activation: Cmd+C (when no text selected) activates grab mode
 * - Hover: Shows component name floating label and highlight outline
 * - Click/Enter: Extracts component data to clipboard
 * - Cmd+Click/Enter: Also opens component file in configured editor
 * - Alt+Arrow: Navigate component hierarchy
 * - Escape: Deactivate
 *
 * Communication with injected.js:
 * - Posts messages to request component info/extraction
 * - Receives responses with component data
 * - See injected.js header for message type documentation
 */

// State
let isActive = false;
let hoveredElement = null;
let activeIndicator = null;
let lastComponentData = null;
let currentHierarchy = null;
let currentHierarchyIndex = -1;
let breadcrumbElement = null;
let floatingLabel = null; // New: floating label element
let selectedEditor = 'cursor'; // Default editor, will be loaded from storage

// Load saved editor preference
if (chrome.storage && chrome.storage.local) {
  chrome.storage.local.get(['selectedEditor'], (result) => {
    if (result.selectedEditor) {
      selectedEditor = result.selectedEditor;
    }
  });
}

// IDE configurations for direct opening
const IDE_CONFIG = {
  cursor: {
    name: 'Cursor',
    buildUrl: (filePath) => `cursor://file/${filePath || ''}`
  },
  windsurf: {
    name: 'Windsurf',
    buildUrl: (filePath) => `windsurf://file/${filePath || ''}`
  }
};

// Inject script into page context to access Vue internals
// Content scripts run in isolated world and can't access page JS variables directly
function injectPageScript() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('injected.js');
  script.onload = function() {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);
}

// Inject script as soon as possible
if (document.head || document.documentElement) {
  injectPageScript();
} else {
  // Wait for DOM to be ready
  document.addEventListener('DOMContentLoaded', injectPageScript);
}

// Track pending action for keyboard shortcuts
let pendingAction = null; // 'copy' or 'editor'

// Global keyboard listener for activation shortcut (⌘C / Ctrl+C)
// This works even when grab mode is not active
document.addEventListener('keydown', handleGlobalKeyDown, true);

function handleGlobalKeyDown(e) {
  // ⌘C or Ctrl+C to activate grab mode (only when not already active)
  if (!isActive && (e.metaKey || e.ctrlKey) && e.key === 'c' && !e.shiftKey) {
    // Don't interfere with text selection copy
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      return; // Let normal copy happen
    }

    e.preventDefault();
    e.stopPropagation();
    isActive = true;
    activate();
  }
}

// Listen for messages from injected script
window.addEventListener('message', (event) => {
  if (event.source !== window) return;

  if (event.data.type === 'VUE_GRAB_COMPONENT_DATA') {
    // Clear extraction timeout
    if (window._vueGrabExtractionTimeout) {
      clearTimeout(window._vueGrabExtractionTimeout);
      window._vueGrabExtractionTimeout = null;
    }

    const componentData = event.data.data;
    if (componentData) {
      lastComponentData = componentData;

      // Handle based on pending action
      if (pendingAction === 'editor') {
        // Copy to clipboard AND open in editor
        copyToClipboard(componentData);
        openInEditor(componentData);
        showToast(`✓ Copied and opening in ${IDE_CONFIG[selectedEditor].name}...`, 'success');
      } else {
        // Default: just copy to clipboard
        copyToClipboard(componentData);
        showToast('✓ Component data copied to clipboard!', 'success');
      }

      pendingAction = null;
      deactivate();
      isActive = false;
    } else {
      // Extraction failed - show error and deactivate
      showToast(event.data.error || 'No Vue component found', 'error');
      pendingAction = null;
      deactivate();
      isActive = false;
    }
  } else if (event.data.type === 'VUE_GRAB_COMPONENT_INFO') {
    // Response from hover detection - show component name and hierarchy
    if (event.data.info && hoveredElement) {
      const componentName = event.data.info.name || 'Anonymous';
      hoveredElement.classList.add('vue-grab-highlight');
      showFloatingLabel(hoveredElement, componentName);

      currentHierarchy = event.data.info.hierarchy || [];
      currentHierarchyIndex = event.data.info.currentIndex ?? -1;
      updateBreadcrumb();
    }
  } else if (event.data.type === 'VUE_GRAB_NAVIGATION_RESULT') {
    // Response from parent/child navigation
    if (event.data.info) {
      currentHierarchy = event.data.info.hierarchy || [];
      currentHierarchyIndex = event.data.info.currentIndex ?? -1;

      // Update the component name display
      if (hoveredElement) {
        hoveredElement.setAttribute('data-vue-component', event.data.info.name || 'Anonymous');
      }
      updateBreadcrumb();
    } else if (event.data.error) {
      showToast(event.data.error, 'error');
    }
  }
});

// Open component in configured editor
function openInEditor(componentData) {
  const filePath = componentData?.filePath;
  const config = IDE_CONFIG[selectedEditor];

  if (config && filePath) {
    const url = config.buildUrl(filePath);
    try {
      window.open(url, '_blank');
    } catch (e) {
      console.error('Vue Grab: Could not open editor:', e);
    }
  }
}

// Initialize Chrome message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggle') {
    isActive = !isActive;
    if (isActive) {
      activate();
    } else {
      deactivate();
    }
    sendResponse({ isActive });
  } else if (request.action === 'getState') {
    sendResponse({ isActive, hasData: lastComponentData !== null });
  } else if (request.action === 'getLastData') {
    sendResponse({ data: lastComponentData });
  } else if (request.action === 'setEditor') {
    // Update selected editor from popup
    selectedEditor = request.editor;
    sendResponse({ success: true });
  } else if (request.action === 'formatAndDownload') {
    if (lastComponentData) {
      triggerDownload(lastComponentData);
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'No component data available' });
    }
  }
  return true;
});

function activate() {
  document.addEventListener('mouseover', handleMouseOver);
  document.addEventListener('mouseout', handleMouseOut);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('keydown', handleKeyDown);

  showActiveIndicator();
  showToast('Vue Grab activated! Click any element to extract its component.', 'success');
}

function deactivate() {
  document.removeEventListener('mouseover', handleMouseOver);
  document.removeEventListener('mouseout', handleMouseOut);
  document.removeEventListener('click', handleClick, true);
  document.removeEventListener('keydown', handleKeyDown);

  if (hoveredElement) {
    hoveredElement.classList.remove('vue-grab-highlight');
    hoveredElement.removeAttribute('data-vue-grab-id');
  }

  // Reset hierarchy state
  currentHierarchy = null;
  currentHierarchyIndex = -1;

  hideActiveIndicator();
  hideBreadcrumb();
  hideFloatingLabel();
}

function handleMouseOver(e) {
  if (!isActive) return;

  hoveredElement = e.target;

  // Create a unique identifier for this element
  const elementId = 'vue-grab-' + Math.random().toString(36).substr(2, 9);
  hoveredElement.setAttribute('data-vue-grab-id', elementId);

  // Ask injected script to find Vue component info
  window.postMessage({
    type: 'VUE_GRAB_GET_INFO',
    elementId: elementId
  }, '*');
}

function handleMouseOut(e) {
  if (!isActive) return;

  if (hoveredElement) {
    hoveredElement.classList.remove('vue-grab-highlight');
    hoveredElement.removeAttribute('data-vue-grab-id');
    hoveredElement = null;
  }

  // Hide floating label
  hideFloatingLabel();

  // Reset hierarchy when mouse leaves element
  currentHierarchy = null;
  currentHierarchyIndex = -1;
  hideBreadcrumb();
}

/**
 * Handle click events during grab mode.
 * Regular click = copy to clipboard
 * Cmd/Ctrl+click = copy and open in editor
 */
function handleClick(e) {
  if (!isActive) return;

  e.preventDefault();
  e.stopPropagation();

  triggerExtraction(e.metaKey || e.ctrlKey, e.target);
}

/**
 * Shared extraction logic for click and Enter key.
 * @param {boolean} openInEditorMode - Whether to also open in editor
 * @param {HTMLElement|null} targetElement - The clicked element (null for Enter key)
 */
function triggerExtraction(openInEditorMode, targetElement) {
  pendingAction = openInEditorMode ? 'editor' : 'copy';

  // Use target element if hoveredElement is not set
  if (!hoveredElement && targetElement) {
    hoveredElement = targetElement;
  }

  if (!hoveredElement) {
    showToast('No element selected. Hover over an element first.', 'error');
    return;
  }

  // Ensure element has an ID for the injected script to find it
  if (!hoveredElement.getAttribute('data-vue-grab-id')) {
    const elementId = 'vue-grab-' + Math.random().toString(36).substr(2, 9);
    hoveredElement.setAttribute('data-vue-grab-id', elementId);
  }

  // Timeout safety: deactivate if extraction doesn't complete
  const extractionTimeout = setTimeout(() => {
    if (isActive) {
      showToast('Extraction timed out. Try again.', 'error');
      pendingAction = null;
      deactivate();
      isActive = false;
    }
  }, 3000);

  window._vueGrabExtractionTimeout = extractionTimeout;
  extractCurrentComponent();
}

/**
 * Handle keyboard shortcuts during grab mode.
 * - Escape: deactivate
 * - Enter: extract and copy (Cmd+Enter for editor)
 * - Alt+ArrowUp: navigate to parent component
 * - Alt+ArrowDown: navigate to child component
 */
function handleKeyDown(e) {
  if (!isActive) return;

  if (e.key === 'Escape') {
    deactivate();
    isActive = false;
    showToast('Vue Grab deactivated', 'success');
    return;
  }

  if (e.key === 'Enter') {
    e.preventDefault();
    e.stopPropagation();
    triggerExtraction(e.metaKey || e.ctrlKey, null);
    return;
  }

  if (e.altKey && e.key === 'ArrowUp') {
    e.preventDefault();
    e.stopPropagation();
    window.postMessage({ type: 'VUE_GRAB_NAVIGATE_PARENT' }, '*');
    return;
  }

  if (e.altKey && e.key === 'ArrowDown') {
    e.preventDefault();
    e.stopPropagation();
    window.postMessage({ type: 'VUE_GRAB_NAVIGATE_CHILD' }, '*');
    return;
  }
}

// Extract the currently selected/navigated component
function extractCurrentComponent() {
  // If user has navigated to a specific component in hierarchy, extract that
  if (currentHierarchyIndex >= 0 && currentHierarchy && currentHierarchy.length > 0) {
    window.postMessage({ type: 'VUE_GRAB_EXTRACT_CURRENT' }, '*');
    return;
  }

  // Otherwise extract from the hovered/clicked element
  if (hoveredElement) {
    let elementId = hoveredElement.getAttribute('data-vue-grab-id');
    if (!elementId) {
      elementId = 'vue-grab-' + Math.random().toString(36).substr(2, 9);
      hoveredElement.setAttribute('data-vue-grab-id', elementId);
    }
    window.postMessage({
      type: 'VUE_GRAB_EXTRACT',
      elementId: elementId
    }, '*');
    return;
  }

  // No element to extract from - clear timeout and show error
  if (window._vueGrabExtractionTimeout) {
    clearTimeout(window._vueGrabExtractionTimeout);
    window._vueGrabExtractionTimeout = null;
  }
  showToast('No element selected. Try hovering over a component first.', 'error');
  pendingAction = null;
  deactivate();
  isActive = false;
}

function copyToClipboard(data) {
  const formatted = formatForClaudeCCode(data);

  // Use modern clipboard API
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(formatted).catch(err => {
      console.error('Could not copy to clipboard:', err);
      fallbackCopy(formatted);
    });
  } else {
    fallbackCopy(formatted);
  }
}

function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

function formatForClaudeCCode(data) {
  // Handle element info safely (may be null when extracting from hierarchy navigation)
  const elementInfo = data.element
    ? `## Element
- **Tag**: <${data.element.tagName}>
- **ID**: ${data.element.id || 'None'}
- **Classes**: ${data.element.classes?.join(', ') || 'None'}
`
    : '';

  let output = `# Vue Component Context

## Component Information
- **Name**: ${data.componentName}
- **File**: ${data.filePath || 'Unknown'}

${elementInfo}## Props
\`\`\`json
${JSON.stringify(data.props, null, 2)}
\`\`\`

## Data/State
\`\`\`json
${JSON.stringify(data.data || data.setupState, null, 2)}
\`\`\`

## Computed Properties
${data.computed?.length ? data.computed.join(', ') : 'None'}

## Methods
${data.methods?.length ? data.methods.join(', ') : 'None'}
`;

  // Add Pinia Stores section
  if (data.piniaStores && data.piniaStores.length > 0) {
    output += `\n## Pinia Stores\n\n`;

    const definitelyUsed = data.piniaStores.filter(s => s.usedByComponent === 'definitely');
    const potentiallyUsed = data.piniaStores.filter(s => s.usedByComponent === 'potentially');
    const unknown = data.piniaStores.filter(s => s.usedByComponent === 'unknown');

    if (definitelyUsed.length > 0) {
      output += `### Definitely Used by Component\n\n`;
      definitelyUsed.forEach(store => {
        output += `#### Store: ${store.id}\n\n`;
        output += `**State:**\n\`\`\`json\n${JSON.stringify(store.state, null, 2)}\n\`\`\`\n\n`;

        if (Object.keys(store.getters).length > 0) {
          output += `**Getters:**\n\`\`\`json\n${JSON.stringify(store.getters, null, 2)}\n\`\`\`\n\n`;
        }

        if (store.actions.length > 0) {
          output += `**Actions:** ${store.actions.join(', ')}\n\n`;
        }
      });
    }

    if (potentiallyUsed.length > 0) {
      output += `### Potentially Related Stores\n\n`;
      potentiallyUsed.forEach(store => {
        output += `- **${store.id}**: ${store.actions.length} actions, ${Object.keys(store.getters).length} getters\n`;
      });
      output += `\n`;
    }

    if (unknown.length > 0) {
      output += `### Other Available Stores\n`;
      output += `${unknown.map(s => s.id).join(', ')}\n\n`;
    }
  }

  // Add Vuex Store section
  if (data.vuexStore) {
    output += `\n## Vuex Store\n\n`;

    output += `**Full State:**\n\`\`\`json\n${JSON.stringify(data.vuexStore.state, null, 2)}\n\`\`\`\n\n`;

    if (data.vuexStore.usedState.length > 0) {
      output += `**State Used by Component:** ${data.vuexStore.usedState.join(', ')}\n\n`;
    }

    if (Object.keys(data.vuexStore.getters).length > 0) {
      output += `**Getters:**\n\`\`\`json\n${JSON.stringify(data.vuexStore.getters, null, 2)}\n\`\`\`\n\n`;

      if (data.vuexStore.usedGetters.length > 0) {
        output += `**Getters Used by Component:** ${data.vuexStore.usedGetters.join(', ')}\n\n`;
      }
    }

    if (data.vuexStore.mutations.length > 0) {
      output += `**Available Mutations:** ${data.vuexStore.mutations.join(', ')}\n\n`;
    }

    if (data.vuexStore.actions.length > 0) {
      output += `**Available Actions:** ${data.vuexStore.actions.join(', ')}\n\n`;
    }

    if (data.vuexStore.modules.length > 0) {
      output += `**Modules:** ${data.vuexStore.modules.join(', ')}\n\n`;
    }

    if (data.vuexStore.likelyUsesMappedHelpers) {
      output += `*Note: Component appears to use mapState/mapGetters helpers*\n\n`;
    }
  }

  // Add TanStack Query section
  if (data.tanstackQueries && data.tanstackQueries.length > 0) {
    output += `\n## TanStack Query (Vue Query)\n\n`;

    const definitelyUsed = data.tanstackQueries.filter(q => q.usedByComponent === 'definitely');
    const potentiallyUsed = data.tanstackQueries.filter(q => q.usedByComponent === 'potentially');
    const unknown = data.tanstackQueries.filter(q => q.usedByComponent === 'unknown');

    if (definitelyUsed.length > 0) {
      output += `### Definitely Used by Component\n\n`;
      definitelyUsed.forEach(query => {
        output += `#### Query: ${JSON.stringify(query.queryKey)}\n\n`;
        output += `- **Status:** ${query.state.status}\n`;
        output += `- **Fetch Status:** ${query.state.fetchStatus}\n`;
        output += `- **Last Updated:** ${query.lastUpdated || 'Never'}\n`;
        output += `- **Data Updates:** ${query.state.dataUpdateCount}\n`;

        if (query.error) {
          output += `- **Error:** ${query.error}\n`;
        }

        output += `\n**Data:**\n\`\`\`json\n${JSON.stringify(query.data, null, 2)}\n\`\`\`\n\n`;
      });
    }

    if (potentiallyUsed.length > 0) {
      output += `### Potentially Related Queries\n\n`;
      potentiallyUsed.forEach(query => {
        output += `- **${JSON.stringify(query.queryKey)}**: ${query.state.status}\n`;
      });
      output += `\n`;
    }

    if (unknown.length > 0) {
      output += `### Other Active Queries\n`;
      output += `${unknown.map(q => JSON.stringify(q.queryKey)).join(', ')}\n\n`;
    }
  }

  // Add Vue Router section
  if (data.routerState) {
    output += `\n## Vue Router State\n\n`;
    output += `- **Path:** ${data.routerState.path}\n`;
    if (data.routerState.name) {
      output += `- **Route Name:** ${data.routerState.name}\n`;
    }
    output += `- **Full Path:** ${data.routerState.fullPath}\n`;

    if (data.routerState.params && Object.keys(data.routerState.params).length > 0) {
      output += `\n**Params:**\n\`\`\`json\n${JSON.stringify(data.routerState.params, null, 2)}\n\`\`\`\n`;
    }

    if (data.routerState.query && Object.keys(data.routerState.query).length > 0) {
      output += `\n**Query:**\n\`\`\`json\n${JSON.stringify(data.routerState.query, null, 2)}\n\`\`\`\n`;
    }

    if (data.routerState.meta && Object.keys(data.routerState.meta).length > 0) {
      output += `\n**Meta:**\n\`\`\`json\n${JSON.stringify(data.routerState.meta, null, 2)}\n\`\`\`\n`;
    }

    if (data.routerState.matched && data.routerState.matched.length > 0) {
      output += `\n**Matched Routes:** ${data.routerState.matched.map(m => m.name || m.path).join(' → ')}\n`;
    }
  }

  // Add Emitted Events section
  if (data.emittedEvents && data.emittedEvents.length > 0) {
    output += `\n## Emitted Events\n`;
    output += `${data.emittedEvents.join(', ')}\n`;
  }

  // Add Provide/Inject section
  if (data.providedValues || data.injectedValues) {
    output += `\n## Provide/Inject\n\n`;

    if (data.providedValues && Object.keys(data.providedValues).length > 0) {
      output += `**Provided by this component:**\n\`\`\`json\n${JSON.stringify(data.providedValues, null, 2)}\n\`\`\`\n\n`;
    }

    if (data.injectedValues && Object.keys(data.injectedValues).length > 0) {
      output += `**Injected into this component:**\n\`\`\`json\n${JSON.stringify(data.injectedValues, null, 2)}\n\`\`\`\n`;
    }
  }

  // Add Slots section
  if (data.slots && Object.keys(data.slots).length > 0) {
    output += `\n## Slots\n\n`;
    for (const [slotName, slotContent] of Object.entries(data.slots)) {
      output += `### ${slotName === 'default' ? 'Default Slot' : `Slot: ${slotName}`}\n`;
      if (typeof slotContent === 'string') {
        output += `${slotContent}\n\n`;
      } else {
        output += `\`\`\`json\n${JSON.stringify(slotContent, null, 2)}\n\`\`\`\n\n`;
      }
    }
  }

  // Add template section
  if (data.template) {
    output += `\n## Template
\`\`\`vue
${data.template}
\`\`\`
`;
  }

  output += `\n---
*Generated by Vue Grab*
`;

  return output;
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `vue-grab-toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showActiveIndicator() {
  activeIndicator = document.createElement('div');
  activeIndicator.className = 'vue-grab-active-indicator';
  activeIndicator.innerHTML = `
    <div class="vue-grab-indicator-title">Vue Grab Active</div>
    <div class="vue-grab-indicator-shortcuts">
      <span class="shortcut"><kbd>Click</kbd>/<kbd>Enter</kbd> Copy</span>
      <span class="shortcut"><kbd>⌘+Click</kbd>/<kbd>⌘+Enter</kbd> + Editor</span>
      <span class="shortcut"><kbd>⌥↑↓</kbd> Navigate</span>
      <span class="shortcut"><kbd>Esc</kbd> Cancel</span>
    </div>
  `;
  document.body.appendChild(activeIndicator);
}

function hideActiveIndicator() {
  if (activeIndicator) {
    activeIndicator.remove();
    activeIndicator = null;
  }
}

// Breadcrumb UI for component hierarchy
function updateBreadcrumb() {
  if (!currentHierarchy || currentHierarchy.length === 0) {
    hideBreadcrumb();
    return;
  }

  if (!breadcrumbElement) {
    breadcrumbElement = document.createElement('div');
    breadcrumbElement.className = 'vue-grab-breadcrumb';
    document.body.appendChild(breadcrumbElement);
  }

  // Build breadcrumb HTML
  const items = currentHierarchy.map((name, index) => {
    const isActive = index === currentHierarchyIndex;
    const classes = ['vue-grab-breadcrumb-item'];
    if (isActive) classes.push('active');
    if (index < currentHierarchyIndex) classes.push('parent');

    return `<span class="${classes.join(' ')}">${name}</span>`;
  });

  breadcrumbElement.innerHTML = `
    <div class="vue-grab-breadcrumb-path">${items.join(' → ')}</div>
    <div class="vue-grab-breadcrumb-hint">⌥↑/↓ to navigate</div>
  `;
}

function hideBreadcrumb() {
  if (breadcrumbElement) {
    breadcrumbElement.remove();
    breadcrumbElement = null;
  }
}

// Floating label for component name (avoids overflow:hidden clipping)
function showFloatingLabel(element, componentName) {
  hideFloatingLabel();

  if (!element || !componentName) return;

  floatingLabel = document.createElement('div');
  floatingLabel.className = 'vue-grab-floating-label';
  floatingLabel.textContent = componentName;
  document.body.appendChild(floatingLabel);

  positionFloatingLabel(element);
}

function positionFloatingLabel(element) {
  if (!floatingLabel || !element) return;

  const rect = element.getBoundingClientRect();
  const labelRect = floatingLabel.getBoundingClientRect();

  // Position above the element, or below if not enough space above
  let top = rect.top + window.scrollY - labelRect.height - 4;
  let left = rect.left + window.scrollX;

  // If would go above viewport, position below instead
  if (top < window.scrollY + 4) {
    top = rect.bottom + window.scrollY + 4;
  }

  // Keep within horizontal viewport bounds
  if (left + labelRect.width > window.innerWidth - 4) {
    left = window.innerWidth - labelRect.width - 4;
  }
  if (left < 4) left = 4;

  floatingLabel.style.top = `${top}px`;
  floatingLabel.style.left = `${left}px`;
}

function hideFloatingLabel() {
  if (floatingLabel) {
    floatingLabel.remove();
    floatingLabel = null;
  }
}

function triggerDownload(componentData) {
  const formatted = formatForClaudeCCode(componentData);
  const componentName = componentData.componentName || 'component';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  // Trigger download via the extension popup
  chrome.runtime.sendMessage({
    action: 'downloadFile',
    content: formatted,
    filename: `${componentName}-${timestamp}.md`
  });

  showToast('Downloading component context...', 'success');
}
