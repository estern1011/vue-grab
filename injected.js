// This script runs in the page context and can access Vue internals
(function() {
  'use strict';

  // Listen for messages from content script
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;

    if (event.data.type === 'VUE_GRAB_GET_INFO') {
      const element = document.querySelector(`[data-vue-grab-id="${event.data.elementId}"]`);
      if (element) {
        const info = getVueComponentInfo(element);
        window.postMessage({
          type: 'VUE_GRAB_COMPONENT_INFO',
          info: info ? { name: info.name } : null
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
    }
  });

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

    // Method 1: Try Vue DevTools hook (most reliable when devtools is present)
    if (window.__VUE_DEVTOOLS_GLOBAL_HOOK__) {
      const hook = window.__VUE_DEVTOOLS_GLOBAL_HOOK__;
      if (hook.apps && hook.apps.size > 0) {
        instance = findComponentViaDevtoolsHook(element, hook);
      }
    }

    // Method 2: Try Vue 3 internal properties
    if (!instance) {
      instance = element.__vueParentComponent;
    }

    if (!instance && element.__vnode) {
      instance = element.__vnode.component;
    }

    // Method 3: Try Vue 2 property
    if (!instance) {
      instance = element.__vue__;
    }

    // Method 4: Check for fiber-like properties (some Vue 3 builds)
    if (!instance && element._vnode) {
      instance = element._vnode.component;
    }

    // Method 5: Walk up the DOM tree
    if (!instance) {
      let parent = element.parentElement;
      let depth = 0;
      const maxDepth = 50;

      while (parent && !instance && depth < maxDepth) {
        instance = parent.__vueParentComponent ||
                   parent.__vnode?.component ||
                   parent.__vue__ ||
                   parent._vnode?.component;

        if (!instance && window.__VUE_DEVTOOLS_GLOBAL_HOOK__) {
          instance = findComponentViaDevtoolsHook(parent, window.__VUE_DEVTOOLS_GLOBAL_HOOK__);
        }

        parent = parent.parentElement;
        depth++;
      }
    }

    if (!instance) return null;

    return {
      name: getComponentName(instance),
      instance
    };
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
            const found = findComponentOwningElement(rootInstance, element);
            if (found) return found;
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

  function findComponentOwningElement(instance, targetElement, visited = new Set()) {
    if (!instance || visited.has(instance)) return null;
    visited.add(instance);

    const el = instance.vnode?.el || instance.subTree?.el || instance.$el;

    if (el && (el === targetElement || (el.contains && el.contains(targetElement)))) {
      const childComponent = findInChildren(instance, targetElement, visited);
      if (childComponent) return childComponent;
      return instance;
    }

    return null;
  }

  function findInChildren(instance, targetElement, visited) {
    if (instance.subTree) {
      const found = searchVNodeTree(instance.subTree, targetElement, visited);
      if (found) return found;
    }

    if (instance.$children) {
      for (const child of instance.$children) {
        const found = findComponentOwningElement(child, targetElement, visited);
        if (found) return found;
      }
    }

    return null;
  }

  function searchVNodeTree(vnode, targetElement, visited) {
    if (!vnode) return null;

    if (vnode.component) {
      const found = findComponentOwningElement(vnode.component, targetElement, visited);
      if (found) return found;
    }

    if (vnode.children) {
      const children = Array.isArray(vnode.children) ? vnode.children : [];
      for (const child of children) {
        if (child && typeof child === 'object') {
          const found = searchVNodeTree(child, targetElement, visited);
          if (found) return found;
        }
      }
    }

    if (vnode.dynamicChildren) {
      for (const child of vnode.dynamicChildren) {
        const found = searchVNodeTree(child, targetElement, visited);
        if (found) return found;
      }
    }

    return null;
  }

  function extractVueComponent(element) {
    const info = getVueComponentInfo(element);
    if (!info) return null;

    const instance = info.instance;

    const data = {
      componentName: info.name,
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
      element: {
        tagName: element.tagName.toLowerCase(),
        id: element.id || null,
        classes: Array.from(element.classList).filter(c => !c.startsWith('vue-grab')),
        attributes: getElementAttributes(element)
      }
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

    return data;
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
