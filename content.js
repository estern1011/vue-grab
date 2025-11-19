// State
let isActive = false;
let hoveredElement = null;
let activeIndicator = null;
let lastComponentData = null;

// Initialize
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
  } else if (request.action === 'sendToCursor') {
    if (lastComponentData) {
      sendToCursor(lastComponentData);
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
    hoveredElement.removeAttribute('data-vue-component');
  }
  
  hideActiveIndicator();
}

function handleMouseOver(e) {
  if (!isActive) return;
  
  hoveredElement = e.target;
  
  // Try to find Vue component info
  const componentInfo = getVueComponentInfo(hoveredElement);
  if (componentInfo) {
    hoveredElement.classList.add('vue-grab-highlight');
    hoveredElement.setAttribute('data-vue-component', componentInfo.name || 'Anonymous');
  }
}

function handleMouseOut(e) {
  if (!isActive) return;
  
  if (hoveredElement) {
    hoveredElement.classList.remove('vue-grab-highlight');
    hoveredElement.removeAttribute('data-vue-component');
    hoveredElement = null;
  }
}

function handleClick(e) {
  if (!isActive) return;

  e.preventDefault();
  e.stopPropagation();

  const element = e.target;
  const componentData = extractVueComponent(element);

  if (componentData) {
    lastComponentData = componentData;
    copyToClipboard(componentData);
    showToast('✓ Component data copied to clipboard!', 'success');
    deactivate();
    isActive = false;
  } else {
    showToast('No Vue component found on this element', 'error');
  }
}

function handleKeyDown(e) {
  if (e.key === 'Escape' && isActive) {
    deactivate();
    isActive = false;
    showToast('Vue Grab deactivated', 'success');
  }
}

function getVueComponentInfo(element) {
  // Try Vue 3 first
  let instance = element.__vnode?.component;
  
  // Try alternative Vue 3 property
  if (!instance) {
    instance = element.__vueParentComponent;
  }
  
  // Try Vue 2
  if (!instance) {
    instance = element.__vue__;
  }
  
  // Walk up the DOM tree to find a Vue component
  if (!instance) {
    let parent = element.parentElement;
    while (parent && !instance) {
      instance = parent.__vnode?.component || parent.__vueParentComponent || parent.__vue__;
      parent = parent.parentElement;
    }
  }
  
  if (!instance) return null;
  
  return {
    name: getComponentName(instance),
    instance
  };
}

function extractVueComponent(element) {
  const info = getVueComponentInfo(element);
  if (!info) return null;

  const instance = info.instance;

  // Extract component data based on Vue version
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
      classes: Array.from(element.classList),
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
    
    // Try to extract computed and methods
    if (instance.proxy) {
      const computedKeys = Object.keys(instance.proxy).filter(key => {
        const descriptor = Object.getOwnPropertyDescriptor(instance.proxy, key);
        return descriptor && typeof descriptor.get === 'function';
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
    attrs[attr.name] = attr.value;
  }
  return attrs;
}

function extractPiniaStores(instance) {
  try {
    // Try to get Pinia instance from the component
    let pinia = null;

    // Vue 3 - try multiple ways to access Pinia
    if (instance.appContext) {
      pinia = instance.appContext.config.globalProperties.$pinia;
    }

    // Try getting from proxy
    if (!pinia && instance.proxy) {
      pinia = instance.proxy.$pinia;
    }

    // Try global Pinia (if available)
    if (!pinia && typeof window !== 'undefined' && window.pinia) {
      pinia = window.pinia;
    }

    if (!pinia || !pinia._s) {
      return null;
    }

    const stores = [];
    const componentCode = getComponentSourceCode(instance);

    // Iterate through all registered stores
    pinia._s.forEach((store, storeId) => {
      const storeData = {
        id: storeId,
        state: serializeData(store.$state),
        getters: {},
        actions: [],
        usedByComponent: 'unknown'
      };

      // Extract getters (computed properties on the store)
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

      // Try to detect if this component uses this store
      if (componentCode) {
        const storeUsagePatterns = [
          new RegExp(`use${storeId.charAt(0).toUpperCase() + storeId.slice(1)}Store`, 'i'),
          new RegExp(`['"\`]${storeId}['"\`]`, 'i'),
          new RegExp(`\\b${storeId}\\b`)
        ];

        const definitelyUsed = storeUsagePatterns.some(pattern => pattern.test(componentCode));
        storeData.usedByComponent = definitelyUsed ? 'definitely' : 'potentially';
      }

      // Check if the component instance has a reference to this store
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

    // Vue 2 - $store is directly available
    if (instance.$store) {
      store = instance.$store;
    }

    // Vue 3 - try to get from proxy
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

    // Extract getter values
    Object.keys(store.getters || {}).forEach(key => {
      try {
        storeData.getters[key] = serializeData(store.getters[key]);
      } catch (e) {
        storeData.getters[key] = '[Error accessing getter]';
      }
    });

    // Try to detect which state and getters this component uses
    if (componentCode) {
      // Look for $store.state.xxx patterns
      const statePattern = /\$store\.state\.(\w+)/g;
      let match;
      while ((match = statePattern.exec(componentCode)) !== null) {
        if (!storeData.usedState.includes(match[1])) {
          storeData.usedState.push(match[1]);
        }
      }

      // Look for $store.getters.xxx or $store.getters['xxx'] patterns
      const gettersPattern = /\$store\.getters\.(\w+)|\$store\.getters\[['"](\w+)['"]\]/g;
      while ((match = gettersPattern.exec(componentCode)) !== null) {
        const getter = match[1] || match[2];
        if (getter && !storeData.usedGetters.includes(getter)) {
          storeData.usedGetters.push(getter);
        }
      }

      // Look for mapState, mapGetters usage
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

    // Try to get QueryClient from the component
    if (instance.proxy && instance.proxy.$queryClient) {
      queryClient = instance.proxy.$queryClient;
    }

    // Try global access (Vue Query usually provides a global hook)
    if (!queryClient && typeof window !== 'undefined') {
      // Try to find it through app context
      if (instance.appContext?.config?.globalProperties?.$queryClient) {
        queryClient = instance.appContext.config.globalProperties.$queryClient;
      }

      // Try window (some setups expose it)
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

      // Try to detect if this component uses this query
      if (componentCode && Array.isArray(query.queryKey)) {
        const keyString = JSON.stringify(query.queryKey);
        const firstKey = query.queryKey[0];

        // Check if the query key appears in component code
        if (componentCode.includes(keyString) ||
            (typeof firstKey === 'string' && componentCode.includes(firstKey))) {
          queryData.usedByComponent = 'definitely';
        } else {
          queryData.usedByComponent = 'potentially';
        }
      }

      // Check if component setupState has a reference to this query
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

    // Sort queries: definitely used first, then potentially, then unknown
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
    // Try to get the component's setup function or render function as string
    if (instance.type) {
      if (instance.type.setup) {
        return instance.type.setup.toString();
      }
      if (instance.type.render) {
        return instance.type.render.toString();
      }
      // Try to get all methods
      return JSON.stringify(instance.type);
    }

    // Vue 2 - try to get from options
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
    // Create a deep copy and handle circular references
    const seen = new WeakSet();
    
    const serialize = (value, depth = 0) => {
      // Limit depth to prevent huge outputs
      if (depth > 5) return '[Deep Object]';
      
      if (value === null) return null;
      if (value === undefined) return undefined;
      
      // Handle primitives
      if (typeof value !== 'object' && typeof value !== 'function') {
        return value;
      }
      
      // Handle functions
      if (typeof value === 'function') {
        return `[Function: ${value.name || 'anonymous'}]`;
      }
      
      // Handle circular references
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
      
      // Handle arrays
      if (Array.isArray(value)) {
        return value.map(item => serialize(item, depth + 1));
      }
      
      // Handle DOM elements
      if (value instanceof HTMLElement) {
        return `[HTMLElement: ${value.tagName.toLowerCase()}]`;
      }
      
      // Handle dates
      if (value instanceof Date) {
        return value.toISOString();
      }
      
      // Handle objects
      const result = {};
      for (const key in value) {
        // Skip internal Vue properties
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
  let output = `# Vue Component Context

## Component Information
- **Name**: ${data.componentName}
- **File**: ${data.filePath || 'Unknown'}

## Element
- **Tag**: <${data.element.tagName}>
- **ID**: ${data.element.id || 'None'}
- **Classes**: ${data.element.classes.join(', ') || 'None'}

## Props
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

  // Add template section
  if (data.template) {
    output += `\n## Template
\`\`\`vue
${data.template}
\`\`\`
`;
  }

  output += `\n---
*Generated by Vue Grab for Claude Code*
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
    Vue Grab Active
    <span class="hint">Press Esc to cancel</span>
  `;
  document.body.appendChild(activeIndicator);
}

function hideActiveIndicator() {
  if (activeIndicator) {
    activeIndicator.remove();
    activeIndicator = null;
  }
}

function sendToCursor(componentData) {
  const formatted = formatForClaudeCCode(componentData);

  // Create a blob from the formatted data
  const blob = new Blob([formatted], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);

  // Try to trigger download via the extension's background script
  // This will be handled by the popup
  chrome.runtime.sendMessage({
    action: 'downloadFile',
    content: formatted,
    filename: 'vue-grab-latest.md'
  });

  // Also try deep linking (may not work due to permissions)
  try {
    const filePath = componentData.filePath || 'component';
    const encodedContext = encodeURIComponent(formatted);
    const cursorUrl = `cursor://file/${filePath}?composer=true&context=${encodedContext}`;

    // Try to open in a new tab (will fail if protocol not registered)
    window.open(cursorUrl, '_blank');
  } catch (e) {
    console.log('Deep linking not available:', e);
  }

  showToast('Sending to Cursor Composer...', 'success');
}
