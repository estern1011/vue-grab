// This script runs in the page context and can access Vue internals
(function() {
  'use strict';

  // Track current component and its hierarchy for navigation
  let currentComponentStack = [];
  let currentStackIndex = -1;

  // Listen for messages from content script
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;

    if (event.data.type === 'VUE_GRAB_GET_INFO') {
      const element = document.querySelector(`[data-vue-grab-id="${event.data.elementId}"]`);
      if (element) {
        const info = getVueComponentInfo(element);
        // Build component hierarchy for this element
        if (info) {
          currentComponentStack = buildComponentHierarchy(info.instance);
          currentStackIndex = currentComponentStack.length - 1;
        } else {
          currentComponentStack = [];
          currentStackIndex = -1;
        }
        window.postMessage({
          type: 'VUE_GRAB_COMPONENT_INFO',
          info: info ? {
            name: info.name,
            hierarchy: currentComponentStack.map(c => c.name),
            currentIndex: currentStackIndex
          } : null
        }, '*');
      }
    } else if (event.data.type === 'VUE_GRAB_EXTRACT') {
      const element = document.querySelector(`[data-vue-grab-id="${event.data.elementId}"]`);
      if (element) {
        const data = extractVueComponent(element);
        const vueStatus = detectVuePresence();

        let error = null;
        if (!data) {
          if (!vueStatus.found) {
            error = 'No Vue.js detected on this page';
          } else if (!vueStatus.devtoolsEnabled) {
            error = 'Vue found but devtools not enabled. Try refreshing the page.';
          } else {
            error = 'No Vue component found. Try clicking on a different element.';
          }
        }

        window.postMessage({
          type: 'VUE_GRAB_COMPONENT_DATA',
          data: data,
          error: error
        }, '*');
      }
    } else if (event.data.type === 'VUE_GRAB_NAVIGATE_PARENT') {
      // Navigate to parent component in hierarchy
      if (currentStackIndex > 0) {
        currentStackIndex--;
        const parentComponent = currentComponentStack[currentStackIndex];
        window.postMessage({
          type: 'VUE_GRAB_NAVIGATION_RESULT',
          info: {
            name: parentComponent.name,
            hierarchy: currentComponentStack.map(c => c.name),
            currentIndex: currentStackIndex
          }
        }, '*');
      } else {
        window.postMessage({
          type: 'VUE_GRAB_NAVIGATION_RESULT',
          info: null,
          error: 'Already at root component'
        }, '*');
      }
    } else if (event.data.type === 'VUE_GRAB_NAVIGATE_CHILD') {
      // Navigate back to child component in hierarchy
      if (currentStackIndex < currentComponentStack.length - 1) {
        currentStackIndex++;
        const childComponent = currentComponentStack[currentStackIndex];
        window.postMessage({
          type: 'VUE_GRAB_NAVIGATION_RESULT',
          info: {
            name: childComponent.name,
            hierarchy: currentComponentStack.map(c => c.name),
            currentIndex: currentStackIndex
          }
        }, '*');
      } else {
        window.postMessage({
          type: 'VUE_GRAB_NAVIGATION_RESULT',
          info: null,
          error: 'Already at clicked element'
        }, '*');
      }
    } else if (event.data.type === 'VUE_GRAB_EXTRACT_CURRENT') {
      // Extract the currently navigated component (not necessarily the clicked element)
      if (currentStackIndex >= 0 && currentComponentStack[currentStackIndex]) {
        const componentInfo = currentComponentStack[currentStackIndex];
        const data = extractFromInstance(componentInfo.instance);
        window.postMessage({
          type: 'VUE_GRAB_COMPONENT_DATA',
          data: data,
          error: data ? null : 'Could not extract component data'
        }, '*');
      } else {
        window.postMessage({
          type: 'VUE_GRAB_COMPONENT_DATA',
          data: null,
          error: 'No component selected'
        }, '*');
      }
    }
  });

  // Build hierarchy from root to current component
  function buildComponentHierarchy(instance) {
    const hierarchy = [];
    let current = instance;

    while (current) {
      hierarchy.unshift({
        name: getComponentName(current),
        instance: current
      });
      // Get parent component
      current = current.parent || current.$parent;
    }

    return hierarchy;
  }

  // Check if Vue is present on the page
  function detectVuePresence() {
    const result = {
      found: false,
      version: null,
      devtoolsEnabled: false
    };

    // Check for Vue devtools hook
    if (window.__VUE_DEVTOOLS_GLOBAL_HOOK__) {
      result.devtoolsEnabled = true;
      if (window.__VUE_DEVTOOLS_GLOBAL_HOOK__.apps?.size > 0) {
        result.found = true;
        result.version = '3.x';
      }
    }

    // Check for Vue 3
    if (window.__VUE__) {
      result.found = true;
      result.version = '3.x';
    }

    // Check for Vue 2
    if (window.Vue) {
      result.found = true;
      result.version = window.Vue.version || '2.x';
    }

    // Check for any element with Vue properties
    if (!result.found) {
      const testElements = document.querySelectorAll('*');
      for (let i = 0; i < Math.min(testElements.length, 100); i++) {
        const el = testElements[i];
        if (el.__vue__ || el.__vueParentComponent || el.__vnode) {
          result.found = true;
          result.version = el.__vue__ ? '2.x' : '3.x';
          break;
        }
      }
    }

    return result;
  }

  function getVueComponentInfo(element) {
    let instance = null;

    // Strategy 1: Walk up DOM to find the IMMEDIATE component that owns this element
    // This is more reliable than top-down traversal for finding the closest component
    let currentEl = element;
    let depth = 0;
    const maxDepth = 100;

    while (currentEl && depth < maxDepth) {
      // Check for Vue 3 component on this element
      if (currentEl.__vueParentComponent) {
        instance = currentEl.__vueParentComponent;
        break;
      }

      // Check for vnode with component
      if (currentEl.__vnode?.component) {
        instance = currentEl.__vnode.component;
        break;
      }

      // Check for Vue 2 component
      if (currentEl.__vue__) {
        instance = currentEl.__vue__;
        break;
      }

      // Check fiber-like properties
      if (currentEl._vnode?.component) {
        instance = currentEl._vnode.component;
        break;
      }

      currentEl = currentEl.parentElement;
      depth++;
    }

    // Strategy 2: If DOM walking finds a component, verify it's the deepest one
    // by checking if any child component's element matches better
    if (instance) {
      const deeperInstance = findDeepestChildContaining(instance, element);
      if (deeperInstance && deeperInstance !== instance) {
        instance = deeperInstance;
      }
    }

    // Strategy 3: Use DevTools hook as fallback for top-down search
    if (!instance && window.__VUE_DEVTOOLS_GLOBAL_HOOK__) {
      const hook = window.__VUE_DEVTOOLS_GLOBAL_HOOK__;
      if (hook.apps && hook.apps.size > 0) {
        instance = findComponentViaDevtoolsHook(element, hook);
      }
    }

    if (!instance) return null;

    return {
      name: getComponentName(instance),
      instance
    };
  }

  // Find the deepest child component that contains the target element
  function findDeepestChildContaining(instance, targetElement, visited = new Set()) {
    if (!instance || visited.has(instance)) return null;
    visited.add(instance);

    let deepest = null;

    // Check all child components
    const children = getChildComponents(instance);
    for (const child of children) {
      if (componentContainsElement(child, targetElement)) {
        // This child contains the target, but check if any of ITS children are deeper
        const deeper = findDeepestChildContaining(child, targetElement, visited);
        deepest = deeper || child;
        break; // We found the branch, no need to check siblings
      }
    }

    return deepest;
  }

  // Get all immediate child components of an instance
  function getChildComponents(instance) {
    const children = [];
    const visited = new Set();

    function collectFromVNode(vnode) {
      if (!vnode || visited.has(vnode)) return;
      visited.add(vnode);

      // If this vnode is a component, add it
      if (vnode.component && !children.includes(vnode.component)) {
        children.push(vnode.component);
        return; // Don't traverse into component's children here
      }

      // Traverse children
      if (Array.isArray(vnode.children)) {
        for (const child of vnode.children) {
          if (child && typeof child === 'object') {
            collectFromVNode(child);
          }
        }
      }

      // Traverse dynamic children
      if (Array.isArray(vnode.dynamicChildren)) {
        for (const child of vnode.dynamicChildren) {
          if (child && typeof child === 'object') {
            collectFromVNode(child);
          }
        }
      }
    }

    // Vue 3: traverse subTree
    if (instance.subTree) {
      collectFromVNode(instance.subTree);
    }

    // Vue 2: use $children
    if (instance.$children) {
      children.push(...instance.$children);
    }

    return children;
  }

  // Check if a component's rendered DOM contains the target element
  function componentContainsElement(instance, targetElement) {
    // Get all possible root elements for this component
    const elements = getComponentElements(instance);

    for (const el of elements) {
      if (el === targetElement) return true;
      if (el && el.contains && el.contains(targetElement)) return true;
    }

    return false;
  }

  // Get all DOM elements that a component renders to
  function getComponentElements(instance) {
    const elements = [];

    // Vue 3
    if (instance.subTree) {
      collectElements(instance.subTree, elements);
    }

    // Direct el reference
    const directEl = instance.vnode?.el || instance.$el;
    if (directEl && !elements.includes(directEl)) {
      elements.push(directEl);
    }

    return elements;
  }

  // Collect DOM elements from a vnode tree
  function collectElements(vnode, elements) {
    if (!vnode) return;

    // If vnode has an element, add it
    if (vnode.el && vnode.el.nodeType === 1) {
      if (!elements.includes(vnode.el)) {
        elements.push(vnode.el);
      }
    }

    // For fragments (type is Symbol), collect from children
    if (typeof vnode.type === 'symbol' || vnode.type === null) {
      if (Array.isArray(vnode.children)) {
        for (const child of vnode.children) {
          if (child && typeof child === 'object') {
            collectElements(child, elements);
          }
        }
      }
    }
  }

  function findComponentViaDevtoolsHook(element, hook) {
    try {
      const apps = hook.apps;
      if (apps) {
        const appList = apps instanceof Set ? Array.from(apps) :
                        apps instanceof Map ? Array.from(apps.values()) :
                        Array.isArray(apps) ? apps : [];

        for (const app of appList) {
          let rootInstance = app._instance || app.$root?._instance;

          if (!rootInstance && hook.appRecords) {
            const appRecord = hook.appRecords.find(r => r.app === app);
            if (appRecord) {
              rootInstance = appRecord.app._instance || appRecord.rootInstance;
            }
          }

          if (rootInstance) {
            // Check if root contains element, then find deepest child
            if (componentContainsElement(rootInstance, element)) {
              const deepest = findDeepestChildContaining(rootInstance, element);
              return deepest || rootInstance;
            }
          }
        }
      }

      if (hook.buffer && Array.isArray(hook.buffer)) {
        for (const item of hook.buffer) {
          const componentInstance = Array.isArray(item) ? item[1] : item;
          if (componentInstance?.vnode?.el === element ||
              componentInstance?.subTree?.el === element) {
            return componentInstance;
          }
        }
      }
    } catch (e) {
      console.debug('Vue Grab: Error accessing devtools hook:', e);
    }
    return null;
  }

  function extractVueComponent(element) {
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

  // Extract component data from an instance (used for both direct extraction and navigation)
  function extractFromInstance(instance) {
    const data = {
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

      if (instance.proxy) {
        const computedKeys = Object.keys(instance.proxy).filter(key => {
          try {
            const descriptor = Object.getOwnPropertyDescriptor(instance.proxy, key);
            return descriptor && typeof descriptor.get === 'function';
          } catch (e) {
            return false;
          }
        });
        data.computed = computedKeys;

        const methodKeys = Object.keys(instance.type).filter(key =>
          typeof instance.type[key] === 'function' &&
          !key.startsWith('_') &&
          key !== 'setup'
        );
        data.methods = methodKeys;
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

  // Extract Vue Router state
  function extractRouterState(instance) {
    try {
      let route = null;
      let router = null;

      // Vue 3 - Composition API
      if (instance.proxy) {
        route = instance.proxy.$route;
        router = instance.proxy.$router;
      }

      // Vue 3 - App context
      if (!route && instance.appContext?.config?.globalProperties) {
        route = instance.appContext.config.globalProperties.$route;
        router = instance.appContext.config.globalProperties.$router;
      }

      // Vue 2
      if (!route && instance.$route) {
        route = instance.$route;
        router = instance.$router;
      }

      // Check setupState for useRoute/useRouter
      if (!route && instance.setupState) {
        for (const key of Object.keys(instance.setupState)) {
          const value = instance.setupState[key];
          if (value && value.path !== undefined && value.params !== undefined) {
            route = value;
            break;
          }
        }
      }

      if (!route) return null;

      return {
        path: route.path,
        name: route.name || null,
        fullPath: route.fullPath,
        params: serializeData(route.params),
        query: serializeData(route.query),
        hash: route.hash || null,
        meta: serializeData(route.meta),
        matched: route.matched?.map(m => ({
          path: m.path,
          name: m.name,
          components: Object.keys(m.components || {})
        })) || [],
        redirectedFrom: route.redirectedFrom?.fullPath || null
      };
    } catch (e) {
      console.debug('Vue Grab: Error extracting router state:', e);
      return null;
    }
  }

  // Extract values provided by this component
  function extractProvidedValues(instance) {
    try {
      let provided = null;

      // Vue 3
      if (instance.provides) {
        // Get only values provided by THIS component, not inherited
        const parentProvides = instance.parent?.provides || {};
        provided = {};

        for (const key of Object.keys(instance.provides)) {
          // Only include if it's different from parent's provides (meaning this component provided it)
          if (instance.provides[key] !== parentProvides[key]) {
            provided[key] = serializeData(instance.provides[key]);
          }
        }
      }

      // Vue 2
      if (instance._provided) {
        provided = serializeData(instance._provided);
      }

      return provided && Object.keys(provided).length > 0 ? provided : null;
    } catch (e) {
      console.debug('Vue Grab: Error extracting provided values:', e);
      return null;
    }
  }

  // Extract values injected into this component
  function extractInjectedValues(instance) {
    try {
      const injected = {};

      // Vue 3 - Check inject option
      if (instance.type?.inject) {
        const injectOptions = instance.type.inject;
        const injectKeys = Array.isArray(injectOptions)
          ? injectOptions
          : Object.keys(injectOptions);

        for (const key of injectKeys) {
          if (instance.proxy && key in instance.proxy) {
            injected[key] = serializeData(instance.proxy[key]);
          }
        }
      }

      // Vue 2
      if (instance.$options?.inject) {
        const injectOptions = instance.$options.inject;
        const injectKeys = Array.isArray(injectOptions)
          ? injectOptions
          : Object.keys(injectOptions);

        for (const key of injectKeys) {
          if (key in instance) {
            injected[key] = serializeData(instance[key]);
          }
        }
      }

      return Object.keys(injected).length > 0 ? injected : null;
    } catch (e) {
      console.debug('Vue Grab: Error extracting injected values:', e);
      return null;
    }
  }

  // Extract emitted events this component can emit
  function extractEmittedEvents(instance) {
    try {
      const events = [];

      // Vue 3 - emits option
      if (instance.type?.emits) {
        const emits = instance.type.emits;
        if (Array.isArray(emits)) {
          events.push(...emits);
        } else if (typeof emits === 'object') {
          events.push(...Object.keys(emits));
        }
      }

      // Vue 3 - Check emitsOptions on instance
      if (instance.emitsOptions) {
        const emits = instance.emitsOptions;
        if (typeof emits === 'object') {
          events.push(...Object.keys(emits).filter(e => !events.includes(e)));
        }
      }

      // Vue 2
      if (instance.$options?.emits) {
        const emits = instance.$options.emits;
        if (Array.isArray(emits)) {
          events.push(...emits.filter(e => !events.includes(e)));
        } else if (typeof emits === 'object') {
          events.push(...Object.keys(emits).filter(e => !events.includes(e)));
        }
      }

      // Check for $emit calls in component source (heuristic)
      const componentCode = getComponentSourceCode(instance);
      if (componentCode) {
        const emitPattern = /\$emit\(['"]([^'"]+)['"]/g;
        const emit2Pattern = /emit\(['"]([^'"]+)['"]/g;
        let match;

        while ((match = emitPattern.exec(componentCode)) !== null) {
          if (!events.includes(match[1])) {
            events.push(match[1]);
          }
        }

        while ((match = emit2Pattern.exec(componentCode)) !== null) {
          if (!events.includes(match[1])) {
            events.push(match[1]);
          }
        }
      }

      return events.length > 0 ? events : null;
    } catch (e) {
      console.debug('Vue Grab: Error extracting emitted events:', e);
      return null;
    }
  }

  // Extract slot content
  function extractSlots(instance) {
    try {
      const slots = {};

      // Vue 3
      if (instance.slots) {
        for (const slotName of Object.keys(instance.slots)) {
          const slotFn = instance.slots[slotName];
          if (typeof slotFn === 'function') {
            try {
              const vnodes = slotFn();
              slots[slotName] = serializeVNodes(vnodes);
            } catch (e) {
              slots[slotName] = '[Slot function - requires props]';
            }
          }
        }
      }

      // Vue 2
      if (instance.$slots) {
        for (const slotName of Object.keys(instance.$slots)) {
          const vnodes = instance.$slots[slotName];
          slots[slotName] = serializeVNodes(vnodes);
        }
      }

      // Vue 2 scoped slots
      if (instance.$scopedSlots) {
        for (const slotName of Object.keys(instance.$scopedSlots)) {
          if (!slots[slotName]) {
            slots[slotName] = '[Scoped slot]';
          }
        }
      }

      return Object.keys(slots).length > 0 ? slots : null;
    } catch (e) {
      console.debug('Vue Grab: Error extracting slots:', e);
      return null;
    }
  }

  // Serialize VNodes to readable format
  function serializeVNodes(vnodes) {
    if (!vnodes) return null;

    const nodes = Array.isArray(vnodes) ? vnodes : [vnodes];
    const result = [];

    for (const vnode of nodes) {
      if (!vnode) continue;

      if (typeof vnode === 'string' || typeof vnode === 'number') {
        result.push({ type: 'text', content: String(vnode) });
        continue;
      }

      // Handle Vue 3 vnodes
      if (vnode.type) {
        const nodeInfo = {
          type: typeof vnode.type === 'string'
            ? vnode.type
            : vnode.type?.name || vnode.type?.__name || 'Component'
        };

        if (vnode.props && Object.keys(vnode.props).length > 0) {
          nodeInfo.props = serializeData(vnode.props);
        }

        if (vnode.children) {
          if (typeof vnode.children === 'string') {
            nodeInfo.content = vnode.children;
          } else if (Array.isArray(vnode.children)) {
            nodeInfo.children = serializeVNodes(vnode.children);
          }
        }

        result.push(nodeInfo);
      }

      // Handle Vue 2 vnodes
      if (vnode.tag) {
        const nodeInfo = {
          type: vnode.componentOptions?.tag || vnode.tag
        };

        if (vnode.data?.attrs) {
          nodeInfo.props = serializeData(vnode.data.attrs);
        }

        if (vnode.children) {
          nodeInfo.children = serializeVNodes(vnode.children);
        }

        if (vnode.text) {
          nodeInfo.content = vnode.text;
        }

        result.push(nodeInfo);
      }
    }

    return result.length > 0 ? result : null;
  }

  function getComponentName(instance) {
    // Vue 3
    if (instance.type) {
      return instance.type.name ||
             instance.type.__name ||
             instance.type.displayName ||
             'AnonymousComponent';
    }

    // Vue 2
    if (instance.$options) {
      return instance.$options.name ||
             instance.$options._componentTag ||
             'AnonymousComponent';
    }

    return 'UnknownComponent';
  }

  function getElementAttributes(element) {
    const attrs = {};
    for (const attr of element.attributes) {
      if (!attr.name.startsWith('data-vue-grab')) {
        attrs[attr.name] = attr.value;
      }
    }
    return attrs;
  }

  function extractPiniaStores(instance) {
    try {
      let pinia = null;

      if (instance.appContext) {
        pinia = instance.appContext.config.globalProperties.$pinia;
      }

      if (!pinia && instance.proxy) {
        pinia = instance.proxy.$pinia;
      }

      if (!pinia && typeof window !== 'undefined' && window.pinia) {
        pinia = window.pinia;
      }

      if (!pinia || !pinia._s) {
        return null;
      }

      const stores = [];
      const componentCode = getComponentSourceCode(instance);

      pinia._s.forEach((store, storeId) => {
        const storeData = {
          id: storeId,
          state: serializeData(store.$state),
          getters: {},
          actions: [],
          usedByComponent: 'unknown'
        };

        Object.keys(store).forEach(key => {
          if (key.startsWith('_') || key.startsWith('$')) return;

          const descriptor = Object.getOwnPropertyDescriptor(store, key);
          if (descriptor && typeof descriptor.get === 'function') {
            try {
              storeData.getters[key] = serializeData(store[key]);
            } catch (e) {
              storeData.getters[key] = '[Error accessing getter]';
            }
          } else if (typeof store[key] === 'function') {
            storeData.actions.push(key);
          }
        });

        if (componentCode) {
          const storeUsagePatterns = [
            new RegExp(`use${storeId.charAt(0).toUpperCase() + storeId.slice(1)}Store`, 'i'),
            new RegExp(`['"\`]${storeId}['"\`]`, 'i'),
            new RegExp(`\\b${storeId}\\b`)
          ];

          const definitelyUsed = storeUsagePatterns.some(pattern => pattern.test(componentCode));
          storeData.usedByComponent = definitelyUsed ? 'definitely' : 'potentially';
        }

        if (instance.setupState) {
          const hasStoreRef = Object.values(instance.setupState).some(value => {
            return value && value.$id === storeId;
          });
          if (hasStoreRef) {
            storeData.usedByComponent = 'definitely';
          }
        }

        stores.push(storeData);
      });

      return stores.length > 0 ? stores : null;
    } catch (e) {
      console.error('Error extracting Pinia stores:', e);
      return null;
    }
  }

  function extractVuexStore(instance) {
    try {
      let store = null;

      if (instance.$store) {
        store = instance.$store;
      }

      if (!store && instance.proxy && instance.proxy.$store) {
        store = instance.proxy.$store;
      }

      if (!store) {
        return null;
      }

      const componentCode = getComponentSourceCode(instance);
      const storeData = {
        state: serializeData(store.state),
        getters: {},
        mutations: Object.keys(store._mutations || {}),
        actions: Object.keys(store._actions || {}),
        modules: Object.keys(store._modules?.root?._children || {}),
        usedState: [],
        usedGetters: []
      };

      Object.keys(store.getters || {}).forEach(key => {
        try {
          storeData.getters[key] = serializeData(store.getters[key]);
        } catch (e) {
          storeData.getters[key] = '[Error accessing getter]';
        }
      });

      if (componentCode) {
        const statePattern = /\$store\.state\.(\w+)/g;
        let match;
        while ((match = statePattern.exec(componentCode)) !== null) {
          if (!storeData.usedState.includes(match[1])) {
            storeData.usedState.push(match[1]);
          }
        }

        const gettersPattern = /\$store\.getters\.(\w+)|\$store\.getters\[['"](\w+)['"]\]/g;
        while ((match = gettersPattern.exec(componentCode)) !== null) {
          const getter = match[1] || match[2];
          if (getter && !storeData.usedGetters.includes(getter)) {
            storeData.usedGetters.push(getter);
          }
        }

        if (componentCode.includes('mapState') || componentCode.includes('mapGetters')) {
          storeData.likelyUsesMappedHelpers = true;
        }
      }

      return storeData;
    } catch (e) {
      console.error('Error extracting Vuex store:', e);
      return null;
    }
  }

  function extractTanStackQueries(instance) {
    try {
      let queryClient = null;

      if (instance.proxy && instance.proxy.$queryClient) {
        queryClient = instance.proxy.$queryClient;
      }

      if (!queryClient && typeof window !== 'undefined') {
        if (instance.appContext?.config?.globalProperties?.$queryClient) {
          queryClient = instance.appContext.config.globalProperties.$queryClient;
        }

        if (!queryClient && window.__VUE_QUERY_CLIENT__) {
          queryClient = window.__VUE_QUERY_CLIENT__;
        }
      }

      if (!queryClient || !queryClient.getQueryCache) {
        return null;
      }

      const queryCache = queryClient.getQueryCache();
      const allQueries = queryCache.getAll();

      if (!allQueries || allQueries.length === 0) {
        return null;
      }

      const componentCode = getComponentSourceCode(instance);
      const queries = [];

      allQueries.forEach(query => {
        const queryData = {
          queryKey: query.queryKey,
          queryHash: query.queryHash,
          state: {
            status: query.state.status,
            fetchStatus: query.state.fetchStatus,
            dataUpdateCount: query.state.dataUpdateCount,
            errorUpdateCount: query.state.errorUpdateCount
          },
          data: serializeData(query.state.data),
          error: query.state.error ? String(query.state.error) : null,
          lastUpdated: query.state.dataUpdatedAt ? new Date(query.state.dataUpdatedAt).toISOString() : null,
          usedByComponent: 'unknown'
        };

        if (componentCode && Array.isArray(query.queryKey)) {
          const keyString = JSON.stringify(query.queryKey);
          const firstKey = query.queryKey[0];

          if (componentCode.includes(keyString) ||
              (typeof firstKey === 'string' && componentCode.includes(firstKey))) {
            queryData.usedByComponent = 'definitely';
          } else {
            queryData.usedByComponent = 'potentially';
          }
        }

        if (instance.setupState) {
          const hasQueryRef = Object.values(instance.setupState).some(value => {
            return value && value.queryKey &&
                   JSON.stringify(value.queryKey) === JSON.stringify(query.queryKey);
          });
          if (hasQueryRef) {
            queryData.usedByComponent = 'definitely';
          }
        }

        queries.push(queryData);
      });

      queries.sort((a, b) => {
        const order = { definitely: 0, potentially: 1, unknown: 2 };
        return order[a.usedByComponent] - order[b.usedByComponent];
      });

      return queries.length > 0 ? queries : null;
    } catch (e) {
      console.error('Error extracting TanStack queries:', e);
      return null;
    }
  }

  function getComponentSourceCode(instance) {
    try {
      if (instance.type) {
        if (instance.type.setup) {
          return instance.type.setup.toString();
        }
        if (instance.type.render) {
          return instance.type.render.toString();
        }
        return JSON.stringify(instance.type);
      }

      if (instance.$options) {
        const code = [];
        if (instance.$options.setup) {
          code.push(instance.$options.setup.toString());
        }
        if (instance.$options.methods) {
          code.push(JSON.stringify(instance.$options.methods));
        }
        if (instance.$options.computed) {
          code.push(JSON.stringify(instance.$options.computed));
        }
        return code.join('\n');
      }

      return null;
    } catch (e) {
      return null;
    }
  }

  function serializeData(obj) {
    if (!obj) return null;

    try {
      const seen = new WeakSet();

      const serialize = (value, depth = 0) => {
        if (depth > 5) return '[Deep Object]';

        if (value === null) return null;
        if (value === undefined) return undefined;

        if (typeof value !== 'object' && typeof value !== 'function') {
          return value;
        }

        if (typeof value === 'function') {
          return `[Function: ${value.name || 'anonymous'}]`;
        }

        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);

        if (Array.isArray(value)) {
          return value.map(item => serialize(item, depth + 1));
        }

        if (value instanceof HTMLElement) {
          return `[HTMLElement: ${value.tagName.toLowerCase()}]`;
        }

        if (value instanceof Date) {
          return value.toISOString();
        }

        const result = {};
        for (const key in value) {
          if (key.startsWith('_') || key.startsWith('$')) continue;

          try {
            result[key] = serialize(value[key], depth + 1);
          } catch (e) {
            result[key] = '[Unserializable]';
          }
        }
        return result;
      };

      return serialize(obj);
    } catch (e) {
      console.error('Serialization error:', e);
      return { error: 'Could not serialize data' };
    }
  }

  // Signal that the injected script is ready
  console.debug('Vue Grab: Injected script loaded');
})();
