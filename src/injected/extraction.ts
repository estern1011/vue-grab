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

  // Add element info
  data.element = {
    tagName: element.tagName.toLowerCase(),
    id: element.id || null,
    classes: Array.from(element.classList).filter(c => !c.startsWith('vue-grab')),
    attributes: getElementAttributes(element)
  };

  return data;
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
    data.setupState = serializeData(instance.setupState);
    data.data = serializeData(instance.data);
    data.template = instance.type.template || null;

    // Get computed from component definition (avoids Vue proxy enumeration warning)
    if (instance.type.computed) {
      data.computed = Object.keys(instance.type.computed);
    }

    // Get methods from component definition
    if (instance.type.methods) {
      data.methods = Object.keys(instance.type.methods);
    }

    // For Composition API, check setupState for refs/computed
    if (instance.setupState && !data.computed?.length) {
      // Composition API computed properties are in setupState
      // We already capture them via setupState serialization
      data.computed = [];
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
