// State
let isActive = false;
let hoveredElement = null;
let activeIndicator = null;

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
    sendResponse({ isActive });
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
  return `# Vue Component Context

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

${data.template ? `## Template
\`\`\`vue
${data.template}
\`\`\`
` : ''}

---
*Generated by Vue Grab for Claude Code*
`;
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
