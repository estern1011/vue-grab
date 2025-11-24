// State
let isActive = false;
let hoveredElement = null;
let activeIndicator = null;
let lastComponentData = null;

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

// Listen for messages from injected script
window.addEventListener('message', (event) => {
  if (event.source !== window) return;

  if (event.data.type === 'VUE_GRAB_COMPONENT_DATA') {
    const componentData = event.data.data;
    if (componentData) {
      lastComponentData = componentData;
      copyToClipboard(componentData);
      showToast('✓ Component data copied to clipboard!', 'success');
      deactivate();
      isActive = false;
    } else {
      showToast(event.data.error || 'No Vue component found', 'error');
    }
  } else if (event.data.type === 'VUE_GRAB_COMPONENT_INFO') {
    // Response from hover detection
    if (event.data.info && hoveredElement) {
      hoveredElement.classList.add('vue-grab-highlight');
      hoveredElement.setAttribute('data-vue-component', event.data.info.name || 'Anonymous');
    }
  }
});

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
    hoveredElement.removeAttribute('data-vue-component');
    hoveredElement.removeAttribute('data-vue-grab-id');
  }

  hideActiveIndicator();
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
    hoveredElement.removeAttribute('data-vue-component');
    hoveredElement.removeAttribute('data-vue-grab-id');
    hoveredElement = null;
  }
}

function handleClick(e) {
  if (!isActive) return;

  e.preventDefault();
  e.stopPropagation();

  const element = e.target;

  // Create a unique identifier for this element
  const elementId = 'vue-grab-' + Math.random().toString(36).substr(2, 9);
  element.setAttribute('data-vue-grab-id', elementId);

  // Ask injected script to extract Vue component data
  window.postMessage({
    type: 'VUE_GRAB_EXTRACT',
    elementId: elementId
  }, '*');
}

function handleKeyDown(e) {
  if (e.key === 'Escape' && isActive) {
    deactivate();
    isActive = false;
    showToast('Vue Grab deactivated', 'success');
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
