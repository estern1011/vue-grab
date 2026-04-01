/**
 * Core extraction logic for Vue components
 */

import type { VueComponentInstance } from './types';
import { serializeData } from './serialization';
import { getVueComponentInfo, getComponentName, getElementAttributes } from './detection';
import { extractPiniaStores, extractVuexStore, extractTanStackQueries } from './stores';
import { extractRouterState, extractProvidedValues, extractInjectedValues, extractEmittedEvents, extractSlots } from './features';

/**
 * Extract Vue component data from a DOM element
 */
export function extractVueComponent(element: HTMLElement): any | null {
  const info = getVueComponentInfo(element);
  if (!info) return null;

  const instance = info.instance;

  const data = extractFromInstance(instance);

  // Add element info with locator data
  const rect = element.getBoundingClientRect();
  data.element = {
    tagName: element.tagName.toLowerCase(),
    id: element.id || null,
    classes: Array.from(element.classList).filter(c => !c.startsWith('vue-grab')),
    attributes: getElementAttributes(element),
    selector: buildUniqueSelector(element),
    xpath: buildXPath(element),
    textContent: getTextSnippet(element),
    boundingBox: {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    },
    pageUrl: window.location.href,
    renderedHtml: getRenderedHtml(element),
    computedStyles: getRelevantStyles(element)
  };

  return data;
}

/**
 * Get a trimmed snapshot of the element's rendered HTML
 */
function getRenderedHtml(element: HTMLElement): string | null {
  try {
    const html = element.outerHTML;
    if (!html) return null;
    // Cap at 2000 chars to avoid massive payloads
    return html.length > 2000 ? html.slice(0, 1997) + '...' : html;
  } catch {
    return null;
  }
}

/**
 * Get layout-relevant computed styles (skip defaults/inherited noise)
 */
function getRelevantStyles(element: HTMLElement): Record<string, string> | null {
  try {
    const computed = window.getComputedStyle(element);
    const relevant: Record<string, string> = {};
    const props = [
      'display', 'position', 'width', 'height', 'margin', 'padding',
      'flex-direction', 'justify-content', 'align-items', 'gap',
      'grid-template-columns', 'grid-template-rows',
      'overflow', 'z-index', 'opacity', 'visibility',
      'color', 'background-color', 'font-size', 'font-weight',
      'border', 'border-radius', 'box-shadow',
    ];
    for (const prop of props) {
      const val = computed.getPropertyValue(prop);
      if (val && val !== 'none' && val !== 'normal' && val !== 'auto'
        && val !== '0px' && val !== 'visible' && val !== 'static'
        && val !== 'rgba(0, 0, 0, 0)' && val !== '1') {
        relevant[prop] = val;
      }
    }
    return Object.keys(relevant).length > 0 ? relevant : null;
  } catch {
    return null;
  }
}

/**
 * Build a unique CSS selector for an element
 */
function buildUniqueSelector(element: HTMLElement): string {
  // If it has an id, that's the most reliable
  if (element.id) {
    return `#${CSS.escape(element.id)}`;
  }

  // If it has a data-testid, use that
  const testId = element.getAttribute('data-testid')
    || element.getAttribute('data-test-id')
    || element.getAttribute('data-cy');
  if (testId) {
    return `[data-testid="${CSS.escape(testId)}"]`;
  }

  // Build a path from the element up to an ancestor with an id
  const parts: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current !== document.body && current !== document.documentElement) {
    let part = current.tagName.toLowerCase();

    if (current.id) {
      parts.unshift(`#${CSS.escape(current.id)}`);
      break;
    }

    // Add meaningful classes (skip utility/generated classes)
    const meaningful = Array.from(current.classList)
      .filter(c => !c.startsWith('vue-grab') && !/^[a-z]-[\da-f]+$/i.test(c) && c.length < 40);
    if (meaningful.length > 0) {
      part += '.' + meaningful.slice(0, 2).map(c => CSS.escape(c)).join('.');
    }

    // Add nth-child if needed for uniqueness
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        s => s.tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        part += `:nth-child(${index})`;
      }
    }

    parts.unshift(part);
    current = current.parentElement;

    // Don't go too deep
    if (parts.length >= 5) break;
  }

  return parts.join(' > ');
}

/**
 * Build an XPath for an element
 */
function buildXPath(element: HTMLElement): string {
  const parts: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current !== document.body) {
    let part = current.tagName.toLowerCase();

    if (current.id) {
      parts.unshift(`//*[@id="${current.id}"]`);
      return parts.join('/');
    }

    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        s => s.tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        part += `[${index}]`;
      }
    }

    parts.unshift(part);
    current = current.parentElement;
  }

  return '//' + parts.join('/');
}

/**
 * Get a short text snippet from the element for text-based selectors
 */
function getTextSnippet(element: HTMLElement): string | null {
  // Get direct text content (not from children)
  const directText = Array.from(element.childNodes)
    .filter(n => n.nodeType === Node.TEXT_NODE)
    .map(n => n.textContent?.trim())
    .filter(Boolean)
    .join(' ')
    .trim();

  if (directText && directText.length > 0) {
    return directText.length > 100 ? directText.slice(0, 97) + '...' : directText;
  }

  // Fall back to innerText but keep it short
  const inner = element.innerText?.trim();
  if (inner && inner.length > 0) {
    return inner.length > 100 ? inner.slice(0, 97) + '...' : inner;
  }

  return null;
}

/**
 * Extract and categorize setupState from a Composition API component.
 * Properly unwraps refs and computed, separates methods.
 */
function extractSetupState(setupState: Record<string, any>): {
  state: Record<string, any>;
  computed: string[];
  methods: string[];
} {
  const state: Record<string, any> = {};
  const computed: string[] = [];
  const methods: string[] = [];

  // Get all enumerable keys from the setupState proxy
  let keys: string[];
  try {
    keys = Object.keys(setupState);
  } catch {
    return { state: serializeData(setupState) || {}, computed, methods };
  }

  for (const key of keys) {
    // Skip internal Vue properties
    if (key.startsWith('_') || key.startsWith('$') || key.startsWith('__')) continue;

    try {
      const raw = setupState[key];

      // Check if it's a function (method/composable)
      if (typeof raw === 'function') {
        methods.push(key);
        continue;
      }

      // Skip Vue component definitions (imported child components stored in setupState)
      if (raw && typeof raw === 'object' && (
        typeof raw.render === 'function' ||
        typeof raw.setup === 'function' ||
        raw.__name || raw.__file
      )) {
        continue;
      }

      // Check if it's a computed ref (has .effect and .value)
      if (raw && typeof raw === 'object' && raw.effect && '__v_isRef' in raw) {
        computed.push(key);
        // Also capture the current computed value
        try {
          state[key] = serializeData(raw.value);
        } catch {
          state[key] = '[Computed]';
        }
        continue;
      }

      // Check if it's a ref (has .value and __v_isRef)
      if (raw && typeof raw === 'object' && '__v_isRef' in raw) {
        try {
          state[key] = serializeData(raw.value);
        } catch {
          state[key] = '[Ref]';
        }
        continue;
      }

      // Check if it's a reactive object (__v_isReactive)
      if (raw && typeof raw === 'object' && ('__v_isReactive' in raw || '__v_isShallow' in raw)) {
        state[key] = serializeData(raw);
        continue;
      }

      // Regular value - could be a primitive or plain object
      // The setupState proxy auto-unwraps refs, so reading the value directly works
      state[key] = serializeData(raw);
    } catch {
      state[key] = '[Unreadable]';
    }
  }

  return { state, computed, methods };
}

/**
 * Extract component data from an instance (used for both direct extraction and navigation)
 */
export function extractFromInstance(instance: VueComponentInstance): any {
  const data: any = {
    componentName: getComponentName(instance),
    filePath: null,
    props: null,
    data: null,
    setupState: null,
    computed: null,
    methods: null,
    template: null,
    piniaStores: null,
    vuexStore: null,
    tanstackQueries: null,
    routerState: null,
    providedValues: null,
    injectedValues: null,
    emittedEvents: null,
    slots: null,
    element: null
  };

  // Vue 3
  if (instance.type) {
    data.filePath = instance.type.__file || null;
    data.props = serializeData(instance.props);
    data.data = serializeData(instance.data);
    data.template = instance.type.template || null;

    // Options API: get computed/methods from component definition
    if (instance.type.computed) {
      data.computed = Object.keys(instance.type.computed);
    }
    if (instance.type.methods) {
      data.methods = Object.keys(instance.type.methods);
    }

    // Composition API: extract from setupState with proper ref/computed unwrapping
    if (instance.setupState) {
      const { state, computed, methods } = extractSetupState(instance.setupState);
      data.setupState = state;

      if (!data.computed?.length && computed.length) {
        data.computed = computed;
      }
      if (!data.methods?.length && methods.length) {
        data.methods = methods;
      }
    }
  }

  // Vue 2
  if (instance.$options) {
    data.filePath = instance.$options.__file || null;
    data.props = serializeData(instance.$props);
    data.data = serializeData(instance.$data);
    data.computed = Object.keys(instance.$options.computed || {});
    data.methods = Object.keys(instance.$options.methods || {});
    data.template = instance.$options.template || null;
  }

  // Extract store and query data
  data.piniaStores = extractPiniaStores(instance);
  data.vuexStore = extractVuexStore(instance);
  data.tanstackQueries = extractTanStackQueries(instance);

  // Extract new features
  data.routerState = extractRouterState(instance);
  data.providedValues = extractProvidedValues(instance);
  data.injectedValues = extractInjectedValues(instance);
  data.emittedEvents = extractEmittedEvents(instance);
  data.slots = extractSlots(instance);

  return data;
}
