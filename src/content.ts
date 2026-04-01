/**
 * Vue Grab - Content Script
 *
 * This is the main content script that runs in the extension's isolated world.
 * It handles all UI elements and user interaction.
 *
 * Supports multi-select mode: click multiple components, add comments,
 * preview context, and copy all at once.
 */

import { VUE_GRAB_IDE_CONFIG, VUE_GRAB_CONFIG } from './constants';
import type { ComponentData, ComponentInfo, GrabbedItem } from './types';

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
let currentHierarchy: string[] | null = null;
let currentHierarchyIndex = -1;
let breadcrumbElement: HTMLElement | null = null;
let floatingLabel: HTMLElement | null = null;
let selectedEditor = VUE_GRAB_CONFIG.DEFAULT_EDITOR;

// Multi-select grab list
let grabbedItems: GrabbedItem[] = [];
let panelElement: HTMLElement | null = null;

// Throttling state for mouseover events
let mouseoverThrottleTimer: number | null = null;
const MOUSEOVER_THROTTLE_MS = 100;

// Track pending action for keyboard shortcuts
let pendingAction: 'grab' | 'editor' | null = null;

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
  script.src = chrome.runtime.getURL('src/injected/index.js');
  script.onload = function() {
    (this as any).remove();
  };
  (document.head || document.documentElement).appendChild(script);
}

if (document.head || document.documentElement) {
  injectPageScript();
} else {
  document.addEventListener('DOMContentLoaded', injectPageScript);
}

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
      // Add to grab list instead of copying immediately
      const item: GrabbedItem = {
        id: generateRandomId(),
        componentData,
        comment: '',
        timestamp: Date.now()
      };
      grabbedItems.push(item);
      updatePanel();
      // Item added — panel updates automatically

      if (pendingAction === 'editor') {
        openInEditor(componentData);
      }
      pendingAction = null;
    } else {
      // No component found — silent
      pendingAction = null;
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
      // Navigation error — silent
    }
  }
}

function initializeBridge(): BridgeRuntime | null {
  const host = document.documentElement || document.body;
  if (!host) return null;

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

  if (config && config.scheme && filePath) {
    const url = config.buildUrl(filePath);
    try {
      window.open(url, '_blank');
    } catch (e) {
      console.error('Vue Grab: Could not open editor:', e);
    }
  }
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'toggle') {
    isActive = !isActive;
    if (isActive) {
      activate();
    } else {
      deactivate();
    }
    sendResponse({ isActive });
  } else if (request.action === 'getState') {
    sendResponse({ isActive, hasData: grabbedItems.length > 0 });
  } else if (request.action === 'getLastData') {
    const lastItem = grabbedItems[grabbedItems.length - 1];
    sendResponse({ data: lastItem?.componentData || null });
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
  showPanel();
  // Panel is visible — no toast needed
}

function deactivate(): void {
  document.removeEventListener('mouseover', handleMouseOver);
  document.removeEventListener('mouseout', handleMouseOut);
  document.removeEventListener('click', handleClick, true);
  document.removeEventListener('keydown', handleKeyDown);

  if (mouseoverThrottleTimer !== null) {
    clearTimeout(mouseoverThrottleTimer);
    mouseoverThrottleTimer = null;
  }

  if (hoveredElement) {
    hoveredElement.classList.remove('vue-grab-highlight');
    hoveredElement.removeAttribute('data-vue-grab-id');
  }

  currentHierarchy = null;
  currentHierarchyIndex = -1;

  hideActiveIndicator();
  hideBreadcrumb();
  hideFloatingLabel();
  hidePanel();
}

function handleMouseOver(e: MouseEvent): void {
  if (!isActive) return;

  // Don't highlight panel elements
  const target = e.target as HTMLElement;
  if (target.closest('.vue-grab-panel')) return;

  if (mouseoverThrottleTimer !== null) return;

  hoveredElement = target;
  const elementId = 'vue-grab-' + Math.random().toString(36).substring(2, 11);
  hoveredElement.setAttribute('data-vue-grab-id', elementId);

  sendBridgeRequest({ type: 'VUE_GRAB_GET_INFO', elementId });

  mouseoverThrottleTimer = window.setTimeout(() => {
    mouseoverThrottleTimer = null;
  }, MOUSEOVER_THROTTLE_MS);
}

function handleMouseOut(_e: MouseEvent): void {
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

  const target = e.target as HTMLElement;

  // Don't intercept clicks on the panel itself
  if (target.closest('.vue-grab-panel')) return;

  e.preventDefault();
  e.stopPropagation();

  triggerExtraction(e.metaKey || e.ctrlKey, target);
}

function triggerExtraction(openInEditorMode: boolean, targetElement: HTMLElement | null): void {
  pendingAction = openInEditorMode ? 'editor' : 'grab';

  if (!hoveredElement && targetElement) {
    hoveredElement = targetElement;
  }

  if (!hoveredElement) {
    return;
  }

  if (!hoveredElement.getAttribute('data-vue-grab-id')) {
    const elementId = 'vue-grab-' + Math.random().toString(36).substring(2, 11);
    hoveredElement.setAttribute('data-vue-grab-id', elementId);
  }

  const extractionTimeout = window.setTimeout(() => {
    // Extraction timed out
    pendingAction = null;
  }, VUE_GRAB_CONFIG.EXTRACTION_TIMEOUT);

  window._vueGrabExtractionTimeout = extractionTimeout;
  extractCurrentComponent();
}

function handleKeyDown(e: KeyboardEvent): void {
  if (!isActive) return;

  if (e.key === 'Escape') {
    deactivate();
    isActive = false;
    // Deactivated
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
    sendBridgeRequest({ type: 'VUE_GRAB_EXTRACT', elementId });
    return;
  }

  if (window._vueGrabExtractionTimeout) {
    clearTimeout(window._vueGrabExtractionTimeout);
    window._vueGrabExtractionTimeout = undefined;
  }
  // No element selected
  pendingAction = null;
}

// ============================================================================
// Panel UI - Context Preview & Grab List
// ============================================================================

function showPanel(): void {
  if (panelElement) return;

  panelElement = document.createElement('div');
  panelElement.className = 'vue-grab-panel';
  panelElement.innerHTML = buildPanelHTML();
  document.body.appendChild(panelElement);

  attachPanelListeners();
}

function hidePanel(): void {
  if (panelElement) {
    panelElement.remove();
    panelElement = null;
  }
}

function updatePanel(): void {
  if (!panelElement) return;

  const listEl = panelElement.querySelector('.vue-grab-panel-list');
  const countEl = panelElement.querySelector('.vue-grab-panel-count');
  const actionsEl = panelElement.querySelector('.vue-grab-panel-actions');

  if (listEl) listEl.innerHTML = buildItemsHTML();
  if (countEl) countEl.textContent = `${grabbedItems.length} component${grabbedItems.length !== 1 ? 's' : ''}`;
  if (actionsEl) (actionsEl as HTMLElement).style.display = grabbedItems.length > 0 ? 'flex' : 'none';

  attachItemListeners();
}

function buildPanelHTML(): string {
  const editorOptions = Object.entries(VUE_GRAB_IDE_CONFIG).map(([key, config]) => {
    const isSelected = key === selectedEditor;
    return `<button class="vue-grab-panel-editor-btn ${isSelected ? 'active' : ''}" data-editor="${key}">${config.name}</button>`;
  }).join('');

  const config = VUE_GRAB_IDE_CONFIG[selectedEditor];
  const canSendDirect = config?.buildPromptUrl;
  const sendLabel = canSendDirect ? `Send to ${config.name}` : `Copy for ${config?.name || 'Editor'}`;

  return `
    <div class="vue-grab-panel-header">
      <div class="vue-grab-panel-header-top">
        <div class="vue-grab-panel-title">
          <span class="vue-grab-panel-logo">Vue Grab</span>
          <span class="vue-grab-panel-count">${grabbedItems.length} component${grabbedItems.length !== 1 ? 's' : ''}</span>
        </div>
        <button class="vue-grab-panel-close" title="Close (Esc)">&times;</button>
      </div>
      <div class="vue-grab-panel-editor-row">
        <span class="vue-grab-panel-editor-label">Send to</span>
        ${editorOptions}
      </div>
    </div>
    <div class="vue-grab-panel-list">
      ${buildItemsHTML()}
    </div>
    <div class="vue-grab-panel-actions" style="display: ${grabbedItems.length > 0 ? 'flex' : 'none'}">
      <button class="vue-grab-panel-send">${sendLabel}</button>
      <button class="vue-grab-panel-copy-all">Copy</button>
      <button class="vue-grab-panel-clear">Clear</button>
    </div>
    <div class="vue-grab-panel-empty" style="display: ${grabbedItems.length === 0 ? 'block' : 'none'}">
      Click any element on the page to grab its Vue component context.
    </div>
  `;
}

function buildItemsHTML(): string {
  if (grabbedItems.length === 0) return '';

  return grabbedItems.map((item, index) => {
    const data = item.componentData;

    return `
      <div class="vue-grab-panel-item" data-item-id="${item.id}">
        <div class="vue-grab-panel-item-header">
          <div class="vue-grab-panel-item-info">
            <span class="vue-grab-panel-item-number">${index + 1}</span>
            <span class="vue-grab-panel-item-name">${escapeHtml(data.componentName)}</span>
          </div>
          <button class="vue-grab-panel-item-remove" data-item-id="${item.id}" title="Remove">&times;</button>
        </div>
        ${data.filePath ? `<div class="vue-grab-panel-item-file">${escapeHtml(data.filePath)}</div>` : ''}
        <div class="vue-grab-panel-item-comment-row">
          <input
            type="text"
            class="vue-grab-panel-item-comment"
            data-item-id="${item.id}"
            placeholder="Add a note for the agent..."
            value="${escapeHtml(item.comment)}"
          />
        </div>
        <div class="vue-grab-context">
          ${buildContextSections(data)}
        </div>
      </div>
    `;
  }).join('');
}

function buildContextSections(data: ComponentData): string {
  let html = '';

  // Element info with locators
  if (data.element) {
    const el = data.element;
    const tag = `&lt;${escapeHtml(el.tagName)}&gt;`;
    const parts = [tag];
    if (el.id) parts.push(`#${escapeHtml(el.id)}`);
    if (el.classes?.length) parts.push(el.classes.map(c => `.${escapeHtml(c)}`).join(''));
    html += `<div class="vue-grab-ctx-element">${parts.join('')}</div>`;

    if (el.selector || el.pageUrl) {
      html += `<details class="vue-grab-ctx-section">
        <summary class="vue-grab-ctx-label">Locator</summary>`;
      if (el.pageUrl) {
        html += `<div class="vue-grab-ctx-kv"><span class="vue-grab-ctx-key">url</span><span class="vue-grab-ctx-val vue-grab-ctx-val--string vue-grab-ctx-val--truncate">${escapeHtml(el.pageUrl)}</span></div>`;
      }
      if (el.selector) {
        html += `<div class="vue-grab-ctx-kv"><span class="vue-grab-ctx-key">css</span><span class="vue-grab-ctx-val vue-grab-ctx-val--string">${escapeHtml(el.selector)}</span></div>`;
      }
      if (el.xpath) {
        html += `<div class="vue-grab-ctx-kv"><span class="vue-grab-ctx-key">xpath</span><span class="vue-grab-ctx-val vue-grab-ctx-val--string">${escapeHtml(el.xpath)}</span></div>`;
      }
      if (el.boundingBox) {
        const b = el.boundingBox;
        html += `<div class="vue-grab-ctx-kv"><span class="vue-grab-ctx-key">box</span><span class="vue-grab-ctx-val vue-grab-ctx-val--num">${b.x}, ${b.y} (${b.width}&times;${b.height})</span></div>`;
      }
      if (el.textContent) {
        html += `<div class="vue-grab-ctx-kv"><span class="vue-grab-ctx-key">text</span><span class="vue-grab-ctx-val vue-grab-ctx-val--string vue-grab-ctx-val--truncate">"${escapeHtml(el.textContent)}"</span></div>`;
      }
      html += `</details>`;
    }

    // Computed styles
    if (el.computedStyles && Object.keys(el.computedStyles).length) {
      html += buildObjectSection('Styles', el.computedStyles);
    }

    // Rendered HTML
    if (el.renderedHtml) {
      html += `<details class="vue-grab-ctx-section">
        <summary class="vue-grab-ctx-label">HTML</summary>
        <pre class="vue-grab-ctx-code">${escapeHtml(el.renderedHtml)}</pre>
      </details>`;
    }
  }

  // Props
  html += buildObjectSection('Props', data.props);

  // State
  const state = data.data || data.setupState;
  html += buildObjectSection('State', state);

  // Computed
  if (data.computed?.length) {
    html += buildListSection('Computed', data.computed);
  }

  // Methods
  if (data.methods?.length) {
    html += buildListSection('Methods', data.methods);
  }

  // Pinia Stores
  if (data.piniaStores?.length) {
    const used = data.piniaStores.filter(s => s.usedByComponent === 'definitely');
    const other = data.piniaStores.filter(s => s.usedByComponent !== 'definitely');
    if (used.length) {
      for (const store of used) {
        html += buildStoreSection(store.id, store.state, store.getters, store.actions, true);
      }
    }
    if (other.length) {
      html += `<details class="vue-grab-ctx-section">
        <summary class="vue-grab-ctx-label">${other.length} other store${other.length !== 1 ? 's' : ''}</summary>
        <div class="vue-grab-ctx-tags">${other.map(s => `<span class="vue-grab-ctx-tag">${escapeHtml(s.id)}</span>`).join('')}</div>
      </details>`;
    }
  }

  // Vuex Store
  if (data.vuexStore) {
    html += buildObjectSection('Vuex State', data.vuexStore.state);
    if (data.vuexStore.usedState.length) {
      html += buildListSection('Used State', data.vuexStore.usedState);
    }
  }

  // TanStack Query
  if (data.tanstackQueries?.length) {
    for (const q of data.tanstackQueries.filter(q => q.usedByComponent === 'definitely')) {
      const label = `Query ${JSON.stringify(q.queryKey)}`;
      const badge = q.state.status;
      html += `<details class="vue-grab-ctx-section">
        <summary class="vue-grab-ctx-label">${escapeHtml(label)} <span class="vue-grab-ctx-badge vue-grab-ctx-badge--${badge}">${badge}</span></summary>
        ${renderValue(q.data, 0)}
      </details>`;
    }
  }

  // Router
  if (data.routerState) {
    const r = data.routerState;
    html += `<details class="vue-grab-ctx-section">
      <summary class="vue-grab-ctx-label">Route</summary>
      <div class="vue-grab-ctx-kv">
        <span class="vue-grab-ctx-key">path</span><span class="vue-grab-ctx-val vue-grab-ctx-val--string">${escapeHtml(r.fullPath)}</span>
      </div>
      ${r.name ? `<div class="vue-grab-ctx-kv"><span class="vue-grab-ctx-key">name</span><span class="vue-grab-ctx-val vue-grab-ctx-val--string">${escapeHtml(String(r.name))}</span></div>` : ''}
      ${Object.keys(r.params || {}).length ? `<div class="vue-grab-ctx-kv"><span class="vue-grab-ctx-key">params</span>${renderValue(r.params, 0)}</div>` : ''}
      ${Object.keys(r.query || {}).length ? `<div class="vue-grab-ctx-kv"><span class="vue-grab-ctx-key">query</span>${renderValue(r.query, 0)}</div>` : ''}
    </details>`;
  }

  // Emitted Events
  if (data.emittedEvents?.length) {
    html += buildListSection('Emits', data.emittedEvents);
  }

  // Provide/Inject
  if (data.providedValues && Object.keys(data.providedValues).length) {
    html += buildObjectSection('Provides', data.providedValues);
  }
  if (data.injectedValues && Object.keys(data.injectedValues).length) {
    html += buildObjectSection('Injects', data.injectedValues);
  }

  // Slots
  if (data.slots && Object.keys(data.slots).length) {
    html += buildListSection('Slots', Object.keys(data.slots));
  }

  // Template
  if (data.template) {
    html += `<details class="vue-grab-ctx-section">
      <summary class="vue-grab-ctx-label">Template</summary>
      <pre class="vue-grab-ctx-code">${escapeHtml(data.template)}</pre>
    </details>`;
  }

  return html || '<div class="vue-grab-ctx-empty">No data extracted</div>';
}

function buildObjectSection(label: string, obj: Record<string, any> | null): string {
  if (!obj || Object.keys(obj).length === 0) return '';

  const keys = Object.keys(obj);
  let inner = '';
  for (const key of keys) {
    inner += `<div class="vue-grab-ctx-kv">
      <span class="vue-grab-ctx-key">${escapeHtml(key)}</span>${renderValue(obj[key], 0)}
    </div>`;
  }

  return `<details class="vue-grab-ctx-section" open>
    <summary class="vue-grab-ctx-label">${escapeHtml(label)} <span class="vue-grab-ctx-count">${keys.length}</span></summary>
    ${inner}
  </details>`;
}

function buildListSection(label: string, items: string[]): string {
  return `<details class="vue-grab-ctx-section" open>
    <summary class="vue-grab-ctx-label">${escapeHtml(label)} <span class="vue-grab-ctx-count">${items.length}</span></summary>
    <div class="vue-grab-ctx-tags">${items.map(i => `<span class="vue-grab-ctx-tag">${escapeHtml(i)}</span>`).join('')}</div>
  </details>`;
}

function buildStoreSection(id: string, state: Record<string, any>, getters: Record<string, any>, actions: string[], used: boolean): string {
  let inner = '';

  const stateKeys = Object.keys(state || {});
  if (stateKeys.length) {
    for (const key of stateKeys) {
      inner += `<div class="vue-grab-ctx-kv">
        <span class="vue-grab-ctx-key">${escapeHtml(key)}</span>${renderValue(state[key], 0)}
      </div>`;
    }
  }

  const getterKeys = Object.keys(getters || {});
  if (getterKeys.length) {
    inner += `<div class="vue-grab-ctx-sub">Getters: ${getterKeys.map(g => `<span class="vue-grab-ctx-tag">${escapeHtml(g)}</span>`).join('')}</div>`;
  }

  if (actions.length) {
    inner += `<div class="vue-grab-ctx-sub">Actions: ${actions.map(a => `<span class="vue-grab-ctx-tag">${escapeHtml(a)}</span>`).join('')}</div>`;
  }

  return `<details class="vue-grab-ctx-section" ${used ? 'open' : ''}>
    <summary class="vue-grab-ctx-label">Store: ${escapeHtml(id)} ${used ? '<span class="vue-grab-ctx-badge vue-grab-ctx-badge--success">used</span>' : ''}</summary>
    ${inner}
  </details>`;
}

const MAX_RENDER_DEPTH = 4;

function renderValue(val: any, depth: number): string {
  if (val === null || val === undefined) {
    return `<span class="vue-grab-ctx-val vue-grab-ctx-val--null">${val === null ? 'null' : 'undefined'}</span>`;
  }
  if (typeof val === 'boolean') {
    return `<span class="vue-grab-ctx-val vue-grab-ctx-val--bool">${val}</span>`;
  }
  if (typeof val === 'number') {
    return `<span class="vue-grab-ctx-val vue-grab-ctx-val--num">${val}</span>`;
  }
  if (typeof val === 'string') {
    if (val.startsWith('[Function') || val.startsWith('[Circular') || val.startsWith('[Deep') || val.startsWith('[HTML')) {
      return `<span class="vue-grab-ctx-val vue-grab-ctx-val--ref">${escapeHtml(val)}</span>`;
    }
    const display = val.length > 80 ? val.slice(0, 77) + '...' : val;
    return `<span class="vue-grab-ctx-val vue-grab-ctx-val--string">"${escapeHtml(display)}"</span>`;
  }

  if (Array.isArray(val)) {
    if (val.length === 0) return `<span class="vue-grab-ctx-val vue-grab-ctx-val--ref">[]</span>`;
    if (depth >= MAX_RENDER_DEPTH) {
      return `<span class="vue-grab-ctx-val vue-grab-ctx-val--ref">Array(${val.length})</span>`;
    }

    let inner = '';
    for (let i = 0; i < val.length; i++) {
      inner += `<div class="vue-grab-ctx-kv">
        <span class="vue-grab-ctx-key vue-grab-ctx-key--index">${i}</span>${renderValue(val[i], depth + 1)}
      </div>`;
    }

    return `<details class="vue-grab-ctx-inline">
      <summary class="vue-grab-ctx-expand">Array(${val.length})</summary>
      <div class="vue-grab-ctx-nested">${inner}</div>
    </details>`;
  }

  if (typeof val === 'object') {
    const keys = Object.keys(val);
    if (keys.length === 0) return `<span class="vue-grab-ctx-val vue-grab-ctx-val--ref">{}</span>`;
    if (depth >= MAX_RENDER_DEPTH) {
      return `<span class="vue-grab-ctx-val vue-grab-ctx-val--ref">{${keys.slice(0, 3).join(', ')}${keys.length > 3 ? ', ...' : ''}}</span>`;
    }

    const preview = keys.slice(0, 3).join(', ') + (keys.length > 3 ? ', ...' : '');
    let inner = '';
    for (const key of keys) {
      inner += `<div class="vue-grab-ctx-kv">
        <span class="vue-grab-ctx-key">${escapeHtml(key)}</span>${renderValue(val[key], depth + 1)}
      </div>`;
    }

    return `<details class="vue-grab-ctx-inline">
      <summary class="vue-grab-ctx-expand">{${escapeHtml(preview)}}</summary>
      <div class="vue-grab-ctx-nested">${inner}</div>
    </details>`;
  }

  return `<span class="vue-grab-ctx-val">${escapeHtml(String(val))}</span>`;
}

function handleSendToEditor(): void {
  if (grabbedItems.length === 0) {
    return;
    return;
  }

  const formatted = formatAllGrabbedItems();
  const config = VUE_GRAB_IDE_CONFIG[selectedEditor];

  // If the editor supports prompt deep links, send context directly
  if (config?.buildPromptUrl) {
    // Also copy to clipboard as backup (full untruncated version)
    copyToClipboardText(formatted);

    // Cursor deep links have a URL length limit (~8K chars after encoding).
    // Build a condensed plain-text version for the deep link.
    const condensed = buildCondensedContext();
    const url = config.buildPromptUrl(condensed);

    // URL length safety check — browsers typically cap around 2MB but
    // Cursor's handler may be stricter. Fall back to clipboard if too large.
    if (url.length <= 32000) {
      try { window.open(url, '_blank'); } catch { /* fallback is clipboard */ }
    }
    return;
  }

  // For editors without prompt deep links, copy to clipboard + open file
  copyToClipboardText(formatted);
  if (config?.scheme) {
    const filePaths = new Set(
      grabbedItems.map(i => i.componentData.filePath).filter(Boolean) as string[]
    );
    for (const fp of filePaths) {
      try { window.open(config.buildUrl(fp), '_blank'); } catch { /* ignore */ }
    }
  }
}

function buildCondensedContext(): string {
  const parts: string[] = [];
  parts.push(`Here is Vue component context from ${grabbedItems.length} grabbed component(s):\n`);

  for (const item of grabbedItems) {
    const d = item.componentData;
    parts.push(`Component: ${d.componentName}`);
    if (d.filePath) parts.push(`File: ${d.filePath}`);
    if (item.comment) parts.push(`Note: ${item.comment}`);

    if (d.props && Object.keys(d.props).length) {
      parts.push(`Props: ${JSON.stringify(d.props)}`);
    }
    if (d.data || d.setupState) {
      parts.push(`State: ${JSON.stringify(d.data || d.setupState)}`);
    }
    if (d.computed?.length) parts.push(`Computed: ${d.computed.join(', ')}`);
    if (d.methods?.length) parts.push(`Methods: ${d.methods.join(', ')}`);

    if (d.element) {
      if (d.element.selector) parts.push(`CSS Selector: ${d.element.selector}`);
      if (d.element.pageUrl) parts.push(`Page: ${d.element.pageUrl}`);
    }

    if (d.routerState) {
      parts.push(`Route: ${d.routerState.fullPath}`);
    }

    parts.push(''); // blank line between components
  }

  // Cap to stay within URL limits
  let result = parts.join('\n');
  if (result.length > 7000) {
    result = result.slice(0, 6997) + '...';
  }
  return result;
}

function attachPanelListeners(): void {
  if (!panelElement) return;

  const closeBtn = panelElement.querySelector('.vue-grab-panel-close');
  closeBtn?.addEventListener('click', () => {
    deactivate();
    isActive = false;
  });

  const sendBtn = panelElement.querySelector('.vue-grab-panel-send');
  sendBtn?.addEventListener('click', handleSendToEditor);

  const copyAllBtn = panelElement.querySelector('.vue-grab-panel-copy-all');
  copyAllBtn?.addEventListener('click', handleCopyAll);

  const clearBtn = panelElement.querySelector('.vue-grab-panel-clear');
  clearBtn?.addEventListener('click', () => {
    grabbedItems = [];
    updatePanel();
    const emptyEl = panelElement?.querySelector('.vue-grab-panel-empty') as HTMLElement | null;
    if (emptyEl) emptyEl.style.display = 'block';
  });

  // Editor selector buttons
  panelElement.querySelectorAll('.vue-grab-panel-editor-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const editor = (e.currentTarget as HTMLElement).dataset.editor;
      if (editor) {
        selectedEditor = editor;
        if (chrome.storage?.local) {
          chrome.storage.local.set({ selectedEditor: editor });
        }
        // Re-render panel to update button states and send label
        const listContent = panelElement?.querySelector('.vue-grab-panel-list')?.innerHTML;
        if (panelElement) {
          panelElement.innerHTML = buildPanelHTML();
          const listEl = panelElement.querySelector('.vue-grab-panel-list');
          if (listEl && listContent) listEl.innerHTML = listContent;
          attachPanelListeners();
          attachItemListeners();
        }
      }
    });
  });

  attachItemListeners();
}

function attachItemListeners(): void {
  if (!panelElement) return;

  // Remove buttons
  panelElement.querySelectorAll('.vue-grab-panel-item-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const itemId = (e.currentTarget as HTMLElement).dataset.itemId;
      grabbedItems = grabbedItems.filter(item => item.id !== itemId);
      updatePanel();
      if (grabbedItems.length === 0) {
        const emptyEl = panelElement?.querySelector('.vue-grab-panel-empty') as HTMLElement | null;
        if (emptyEl) emptyEl.style.display = 'block';
      }
    });
  });

  // Comment inputs
  panelElement.querySelectorAll('.vue-grab-panel-item-comment').forEach(input => {
    input.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const itemId = target.dataset.itemId;
      const item = grabbedItems.find(i => i.id === itemId);
      if (item) item.comment = target.value;
    });

    // Prevent keydown from propagating (so typing doesn't trigger grab shortcuts)
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
    });
  });

  // Hide empty message when items exist
  const emptyEl = panelElement?.querySelector('.vue-grab-panel-empty') as HTMLElement | null;
  if (emptyEl) emptyEl.style.display = grabbedItems.length === 0 ? 'block' : 'none';
}

function handleCopyAll(): void {
  if (grabbedItems.length === 0) {
    return;
    return;
  }

  const formatted = formatAllGrabbedItems();
  copyToClipboardText(formatted);
}

function formatAllGrabbedItems(): string {
  if (grabbedItems.length === 1) {
    const item = grabbedItems[0];
    let output = '';
    if (item.comment) {
      output += `> **Note:** ${item.comment}\n\n`;
    }
    output += formatForClaudeCCode(item.componentData);
    return output;
  }

  let output = `# Vue Component Context (${grabbedItems.length} components)\n\n`;

  grabbedItems.forEach((item, index) => {
    output += `---\n\n`;
    output += `## ${index + 1}. ${item.componentData.componentName}`;
    if (item.componentData.filePath) {
      output += ` (${item.componentData.filePath})`;
    }
    output += `\n\n`;

    if (item.comment) {
      output += `> **Note:** ${item.comment}\n\n`;
    }

    output += formatSingleComponent(item.componentData);
    output += `\n`;
  });

  return output;
}

// ============================================================================
// Clipboard & Formatting
// ============================================================================

function copyToClipboardText(text: string): void {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
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
  let output = `# Vue Component Context\n\n`;
  output += formatSingleComponent(data);
  return output;
}

function formatSingleComponent(data: ComponentData): string {
  let elementInfo = '';
  if (data.element) {
    const el = data.element;
    elementInfo = `### Element\n- **Tag**: <${el.tagName}>\n- **ID**: ${el.id || 'None'}\n- **Classes**: ${el.classes?.join(', ') || 'None'}\n`;
    if (el.pageUrl) elementInfo += `- **Page**: ${el.pageUrl}\n`;
    if (el.selector) elementInfo += `- **CSS Selector**: \`${el.selector}\`\n`;
    if (el.xpath) elementInfo += `- **XPath**: \`${el.xpath}\`\n`;
    if (el.boundingBox) elementInfo += `- **Bounding Box**: x=${el.boundingBox.x}, y=${el.boundingBox.y}, ${el.boundingBox.width}x${el.boundingBox.height}\n`;
    if (el.textContent) elementInfo += `- **Text**: "${el.textContent}"\n`;
    if (el.computedStyles && Object.keys(el.computedStyles).length) {
      elementInfo += `\n**Computed Styles:**\n\`\`\`json\n${JSON.stringify(el.computedStyles, null, 2)}\n\`\`\`\n`;
    }
    if (el.renderedHtml) {
      elementInfo += `\n**Rendered HTML:**\n\`\`\`html\n${el.renderedHtml}\n\`\`\`\n`;
    }
    elementInfo += '\n';
  }

  let output = `### Component Information\n- **Name**: ${data.componentName}\n- **File**: ${data.filePath || 'Unknown'}\n\n`;
  output += elementInfo;

  output += `### Props\n\`\`\`json\n${JSON.stringify(data.props, null, 2)}\n\`\`\`\n\n`;
  output += `### Data/State\n\`\`\`json\n${JSON.stringify(data.data || data.setupState, null, 2)}\n\`\`\`\n\n`;
  output += `### Computed Properties\n${data.computed?.length ? data.computed.join(', ') : 'None'}\n\n`;
  output += `### Methods\n${data.methods?.length ? data.methods.join(', ') : 'None'}\n`;

  if (data.piniaStores && data.piniaStores.length > 0) {
    output += `\n### Pinia Stores\n\n`;
    const definitelyUsed = data.piniaStores.filter(s => s.usedByComponent === 'definitely');
    const potentiallyUsed = data.piniaStores.filter(s => s.usedByComponent === 'potentially');
    const unknown = data.piniaStores.filter(s => s.usedByComponent === 'unknown');

    if (definitelyUsed.length > 0) {
      output += `#### Definitely Used by Component\n\n`;
      definitelyUsed.forEach(store => {
        output += `**Store: ${store.id}**\n\n`;
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
      output += `#### Potentially Related Stores\n\n`;
      potentiallyUsed.forEach(store => {
        output += `- **${store.id}**: ${store.actions.length} actions, ${Object.keys(store.getters).length} getters\n`;
      });
      output += `\n`;
    }
    if (unknown.length > 0) {
      output += `#### Other Available Stores\n${unknown.map(s => s.id).join(', ')}\n\n`;
    }
  }

  if (data.vuexStore) {
    output += `\n### Vuex Store\n\n`;
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

  if (data.tanstackQueries && data.tanstackQueries.length > 0) {
    output += `\n### TanStack Query (Vue Query)\n\n`;
    const definitelyUsed = data.tanstackQueries.filter(q => q.usedByComponent === 'definitely');
    const potentiallyUsed = data.tanstackQueries.filter(q => q.usedByComponent === 'potentially');
    const unknown = data.tanstackQueries.filter(q => q.usedByComponent === 'unknown');

    if (definitelyUsed.length > 0) {
      output += `#### Definitely Used by Component\n\n`;
      definitelyUsed.forEach(query => {
        output += `**Query: ${JSON.stringify(query.queryKey)}**\n\n`;
        output += `- **Status:** ${query.state.status}\n`;
        output += `- **Fetch Status:** ${query.state.fetchStatus}\n`;
        output += `- **Last Updated:** ${query.lastUpdated || 'Never'}\n`;
        output += `- **Data Updates:** ${query.state.dataUpdateCount}\n`;
        if (query.error) output += `- **Error:** ${query.error}\n`;
        output += `\n**Data:**\n\`\`\`json\n${JSON.stringify(query.data, null, 2)}\n\`\`\`\n\n`;
      });
    }
    if (potentiallyUsed.length > 0) {
      output += `#### Potentially Related Queries\n\n`;
      potentiallyUsed.forEach(query => {
        output += `- **${JSON.stringify(query.queryKey)}**: ${query.state.status}\n`;
      });
      output += `\n`;
    }
    if (unknown.length > 0) {
      output += `#### Other Active Queries\n${unknown.map(q => JSON.stringify(q.queryKey)).join(', ')}\n\n`;
    }
  }

  if (data.routerState) {
    output += `\n### Vue Router State\n\n`;
    output += `- **Path:** ${data.routerState.path}\n`;
    if (data.routerState.name) output += `- **Route Name:** ${data.routerState.name}\n`;
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
      output += `\n**Matched Routes:** ${data.routerState.matched.map(m => m.name || m.path).join(' > ')}\n`;
    }
  }

  if (data.emittedEvents && data.emittedEvents.length > 0) {
    output += `\n### Emitted Events\n${data.emittedEvents.join(', ')}\n`;
  }

  if (data.providedValues || data.injectedValues) {
    output += `\n### Provide/Inject\n\n`;
    if (data.providedValues && Object.keys(data.providedValues).length > 0) {
      output += `**Provided by this component:**\n\`\`\`json\n${JSON.stringify(data.providedValues, null, 2)}\n\`\`\`\n\n`;
    }
    if (data.injectedValues && Object.keys(data.injectedValues).length > 0) {
      output += `**Injected into this component:**\n\`\`\`json\n${JSON.stringify(data.injectedValues, null, 2)}\n\`\`\`\n`;
    }
  }

  if (data.slots && Object.keys(data.slots).length > 0) {
    output += `\n### Slots\n\n`;
    for (const [slotName, slotContent] of Object.entries(data.slots)) {
      output += `#### ${slotName === 'default' ? 'Default Slot' : `Slot: ${slotName}`}\n`;
      if (typeof slotContent === 'string') {
        output += `${slotContent}\n\n`;
      } else {
        output += `\`\`\`json\n${JSON.stringify(slotContent, null, 2)}\n\`\`\`\n\n`;
      }
    }
  }

  if (data.template) {
    output += `\n### Template\n\`\`\`vue\n${data.template}\n\`\`\`\n`;
  }

  return output;
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ============================================================================
// UI Elements
// ============================================================================

function showActiveIndicator(): void {
  activeIndicator = document.createElement('div');
  activeIndicator.className = 'vue-grab-active-indicator';
  activeIndicator.innerHTML = `
    <div class="vue-grab-indicator-title">Vue Grab Active</div>
    <div class="vue-grab-indicator-shortcuts">
      <span class="shortcut"><kbd>Click</kbd>/<kbd>Enter</kbd> Add to list</span>
      <span class="shortcut"><kbd>⌥↑↓</kbd> Navigate</span>
      <span class="shortcut"><kbd>Esc</kbd> Done</span>
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
    <div class="vue-grab-breadcrumb-path">${items.join(' > ')}</div>
    <div class="vue-grab-breadcrumb-hint">Alt+Up/Down to navigate</div>
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
