/**
 * Vue Grab - Content Script
 *
 * This is the main content script that runs in the extension's isolated world.
 * It handles all UI elements and user interaction.
 */

import { VUE_GRAB_IDE_CONFIG, VUE_GRAB_CONFIG } from './constants';
import type { ComponentData, ComponentInfo } from './types';

interface BridgeHandshake {
  bridgeId: string;
  requestEvent: string;
  responseEvent: string;
}

type BridgeRequestMessage =
  | { type: 'VUE_GRAB_GET_INFO'; elementId: string }
  | { type: 'VUE_GRAB_EXTRACT'; elementId: string }
  | { type: 'VUE_GRAB_EXTRACT_CURRENT' }
  | { type: 'VUE_GRAB_NAVIGATE_PARENT' }
  | { type: 'VUE_GRAB_NAVIGATE_CHILD' };

type BridgeResponseMessage =
  | { type: 'VUE_GRAB_COMPONENT_DATA'; data: ComponentData | null; error?: string | null }
  | { type: 'VUE_GRAB_COMPONENT_INFO'; info: ComponentInfo | null }
  | { type: 'VUE_GRAB_NAVIGATION_RESULT'; info: ComponentInfo | null; error?: string | null };

interface BridgeRuntime {
  element: HTMLElement;
  config: BridgeHandshake;
}

// Extend Window interface for our custom properties
declare global {
  interface Window {
    _vueGrabExtractionTimeout?: number;
  }
}

const bridgeRuntime = initializeBridge();

// State
let isActive = false;
let hoveredElement: HTMLElement | null = null;
let activeIndicator: HTMLElement | null = null;
let lastComponentData: ComponentData | null = null;
let currentHierarchy: string[] | null = null;
let currentHierarchyIndex = -1;
let breadcrumbElement: HTMLElement | null = null;
let floatingLabel: HTMLElement | null = null;
let selectedEditor = VUE_GRAB_CONFIG.DEFAULT_EDITOR;

// Load saved editor preference
if (chrome.storage && chrome.storage.local) {
  chrome.storage.local.get(['selectedEditor'], (result) => {
    if (result.selectedEditor) {
      selectedEditor = result.selectedEditor as string;
    }
  });
}

// Inject script into page context to access Vue internals
function injectPageScript(): void {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('src/injected.js');
  script.onload = function() {
    (this as any).remove();
  };
  (document.head || document.documentElement).appendChild(script);
}

// Inject script as soon as possible
if (document.head || document.documentElement) {
  injectPageScript();
} else {
  document.addEventListener('DOMContentLoaded', injectPageScript);
}

// Track pending action for keyboard shortcuts
let pendingAction: 'copy' | 'editor' | null = null;

if (bridgeRuntime) {
  bridgeRuntime.element.addEventListener(bridgeRuntime.config.responseEvent, handleBridgeResponse as EventListener);
} else {
  console.error('Vue Grab: Bridge initialization failed. Extraction will not work.');
}

function handleBridgeResponse(event: Event): void {
  const customEvent = event as CustomEvent<BridgeResponseMessage>;
  const detail = customEvent.detail;
  if (!detail) return;

  if (detail.type === 'VUE_GRAB_COMPONENT_DATA') {
    if (window._vueGrabExtractionTimeout) {
      clearTimeout(window._vueGrabExtractionTimeout);
      window._vueGrabExtractionTimeout = undefined;
    }

    const componentData = detail.data;
    if (componentData) {
      lastComponentData = componentData;

      if (pendingAction === 'editor') {
        copyToClipboard(componentData);
        openInEditor(componentData);
        showToast(`✓ Copied and opening in ${VUE_GRAB_IDE_CONFIG[selectedEditor]?.name}...`, 'success');
      } else {
        copyToClipboard(componentData);
        showToast('✓ Component data copied to clipboard!', 'success');
      }

      pendingAction = null;
      deactivate();
      isActive = false;
    } else {
      showToast(detail.error || 'No Vue component found', 'error');
      pendingAction = null;
      deactivate();
      isActive = false;
    }
  } else if (detail.type === 'VUE_GRAB_COMPONENT_INFO') {
    if (detail.info && hoveredElement) {
      const componentName = detail.info.name || 'Anonymous';
      hoveredElement.classList.add('vue-grab-highlight');
      showFloatingLabel(hoveredElement, componentName);

      currentHierarchy = detail.info.hierarchy || [];
      currentHierarchyIndex = detail.info.currentIndex ?? -1;
      updateBreadcrumb();
    }
  } else if (detail.type === 'VUE_GRAB_NAVIGATION_RESULT') {
    if (detail.info) {
      currentHierarchy = detail.info.hierarchy || [];
      currentHierarchyIndex = detail.info.currentIndex ?? -1;

      if (hoveredElement) {
        hoveredElement.setAttribute('data-vue-component', detail.info.name || 'Anonymous');
      }
      updateBreadcrumb();
    } else if (detail.error) {
      showToast(detail.error, 'error');
    }
  }
}

function initializeBridge(): BridgeRuntime | null {
  const host = document.documentElement || document.body;
  if (!host) {
    return null;
  }

  const suffix = generateRandomId();
  const handshake: BridgeHandshake = {
    bridgeId: `vue-grab-bridge-${suffix}`,
    requestEvent: `vue-grab-request-${suffix}`,
    responseEvent: `vue-grab-response-${suffix}`
  };

  const element = document.createElement('div');
  element.id = handshake.bridgeId;
  element.style.display = 'none';
  element.setAttribute('data-vue-grab-bridge', 'true');
  element.setAttribute('data-request-event', handshake.requestEvent);
  element.setAttribute('data-response-event', handshake.responseEvent);
  host.appendChild(element);

  return { element, config: handshake };
}

function generateRandomId(): string {
  if (window.crypto && window.crypto.getRandomValues) {
    const array = new Uint32Array(2);
    window.crypto.getRandomValues(array);
    return Array.from(array, (value) => value.toString(16)).join('');
  }
  return Math.random().toString(36).substring(2, 11);
}

function sendBridgeRequest(message: BridgeRequestMessage): void {
  if (!bridgeRuntime) {
    console.warn('Vue Grab: Cannot communicate with injected script.');
    return;
  }

  const event = new CustomEvent(bridgeRuntime.config.requestEvent, {
    detail: message,
    bubbles: false,
    composed: false
  });
  bridgeRuntime.element.dispatchEvent(event);
}

function openInEditor(componentData: ComponentData): void {
  const filePath = componentData?.filePath;
  const config = VUE_GRAB_IDE_CONFIG[selectedEditor];

  if (config && filePath) {
    const url = config.buildUrl(filePath);
    try {
      window.open(url, '_blank');
    } catch (e) {
      console.error('Vue Grab: Could not open editor:', e);
    }
  }
}

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
    selectedEditor = request.editor as string;
    sendResponse({ success: true });
  }
  return true;
});

function activate(): void {
  document.addEventListener('mouseover', handleMouseOver);
  document.addEventListener('mouseout', handleMouseOut);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('keydown', handleKeyDown);

  showActiveIndicator();
  showToast('Vue Grab activated! Click any element to extract its component.', 'success');
}

function deactivate(): void {
  document.removeEventListener('mouseover', handleMouseOver);
  document.removeEventListener('mouseout', handleMouseOut);
  document.removeEventListener('click', handleClick, true);
  document.removeEventListener('keydown', handleKeyDown);

  if (hoveredElement) {
    hoveredElement.classList.remove('vue-grab-highlight');
    hoveredElement.removeAttribute('data-vue-grab-id');
  }

  currentHierarchy = null;
  currentHierarchyIndex = -1;

  hideActiveIndicator();
  hideBreadcrumb();
  hideFloatingLabel();
}

function handleMouseOver(e: MouseEvent): void {
  if (!isActive) return;

  hoveredElement = e.target as HTMLElement;

  const elementId = 'vue-grab-' + Math.random().toString(36).substring(2, 11);
  hoveredElement.setAttribute('data-vue-grab-id', elementId);

  sendBridgeRequest({
    type: 'VUE_GRAB_GET_INFO',
    elementId
  });
}

function handleMouseOut(e: MouseEvent): void {
  if (!isActive) return;

  if (hoveredElement) {
    hoveredElement.classList.remove('vue-grab-highlight');
    hoveredElement.removeAttribute('data-vue-grab-id');
    hoveredElement = null;
  }

  hideFloatingLabel();
  currentHierarchy = null;
  currentHierarchyIndex = -1;
  hideBreadcrumb();
}

function handleClick(e: MouseEvent): void {
  if (!isActive) return;

  e.preventDefault();
  e.stopPropagation();

  triggerExtraction(e.metaKey || e.ctrlKey, e.target as HTMLElement);
}

function triggerExtraction(openInEditorMode: boolean, targetElement: HTMLElement | null): void {
  pendingAction = openInEditorMode ? 'editor' : 'copy';

  if (!hoveredElement && targetElement) {
    hoveredElement = targetElement;
  }

  if (!hoveredElement) {
    showToast('No element selected. Hover over an element first.', 'error');
    return;
  }

  if (!hoveredElement.getAttribute('data-vue-grab-id')) {
    const elementId = 'vue-grab-' + Math.random().toString(36).substring(2, 11);
    hoveredElement.setAttribute('data-vue-grab-id', elementId);
  }

  const extractionTimeout = window.setTimeout(() => {
    if (isActive) {
      showToast('Extraction timed out. Try again.', 'error');
      pendingAction = null;
      deactivate();
      isActive = false;
    }
  }, VUE_GRAB_CONFIG.EXTRACTION_TIMEOUT);

  window._vueGrabExtractionTimeout = extractionTimeout;
  extractCurrentComponent();
}

function handleKeyDown(e: KeyboardEvent): void {
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
    sendBridgeRequest({ type: 'VUE_GRAB_NAVIGATE_PARENT' });
    return;
  }

  if (e.altKey && e.key === 'ArrowDown') {
    e.preventDefault();
    e.stopPropagation();
    sendBridgeRequest({ type: 'VUE_GRAB_NAVIGATE_CHILD' });
    return;
  }
}

function extractCurrentComponent(): void {
  if (currentHierarchyIndex >= 0 && currentHierarchy && currentHierarchy.length > 0) {
    sendBridgeRequest({ type: 'VUE_GRAB_EXTRACT_CURRENT' });
    return;
  }

  if (hoveredElement) {
    let elementId = hoveredElement.getAttribute('data-vue-grab-id');
    if (!elementId) {
      elementId = 'vue-grab-' + Math.random().toString(36).substring(2, 11);
      hoveredElement.setAttribute('data-vue-grab-id', elementId);
    }
    sendBridgeRequest({
      type: 'VUE_GRAB_EXTRACT',
      elementId
    });
    return;
  }

  if (window._vueGrabExtractionTimeout) {
    clearTimeout(window._vueGrabExtractionTimeout);
    window._vueGrabExtractionTimeout = undefined;
  }
  showToast('No element selected. Try hovering over a component first.', 'error');
  pendingAction = null;
  deactivate();
  isActive = false;
}

function copyToClipboard(data: ComponentData): void {
  const formatted = formatForClaudeCCode(data);

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(formatted).catch(err => {
      console.error('Could not copy to clipboard:', err);
      fallbackCopy(formatted);
    });
  } else {
    fallbackCopy(formatted);
  }
}

function fallbackCopy(text: string): void {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

function formatForClaudeCCode(data: ComponentData): string {
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

function showToast(message: string, type: 'success' | 'error' = 'success'): void {
  const toast = document.createElement('div');
  toast.className = `vue-grab-toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, VUE_GRAB_CONFIG.TOAST_DURATION);
}

function showActiveIndicator(): void {
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

function hideActiveIndicator(): void {
  if (activeIndicator) {
    activeIndicator.remove();
    activeIndicator = null;
  }
}

function updateBreadcrumb(): void {
  if (!currentHierarchy || currentHierarchy.length === 0) {
    hideBreadcrumb();
    return;
  }

  if (!breadcrumbElement) {
    breadcrumbElement = document.createElement('div');
    breadcrumbElement.className = 'vue-grab-breadcrumb';
    document.body.appendChild(breadcrumbElement);
  }

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

function hideBreadcrumb(): void {
  if (breadcrumbElement) {
    breadcrumbElement.remove();
    breadcrumbElement = null;
  }
}

function showFloatingLabel(element: HTMLElement, componentName: string): void {
  hideFloatingLabel();

  if (!element || !componentName) return;

  floatingLabel = document.createElement('div');
  floatingLabel.className = 'vue-grab-floating-label';
  floatingLabel.textContent = componentName;
  document.body.appendChild(floatingLabel);

  positionFloatingLabel(element);
}

function positionFloatingLabel(element: HTMLElement): void {
  if (!floatingLabel || !element) return;

  const rect = element.getBoundingClientRect();
  const labelRect = floatingLabel.getBoundingClientRect();

  let top = rect.top + window.scrollY - labelRect.height - 4;
  let left = rect.left + window.scrollX;

  if (top < window.scrollY + 4) {
    top = rect.bottom + window.scrollY + 4;
  }

  if (left + labelRect.width > window.innerWidth - 4) {
    left = window.innerWidth - labelRect.width - 4;
  }
  if (left < 4) left = 4;

  floatingLabel.style.top = `${top}px`;
  floatingLabel.style.left = `${left}px`;
}

function hideFloatingLabel(): void {
  if (floatingLabel) {
    floatingLabel.remove();
    floatingLabel = null;
  }
}
