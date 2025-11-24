/**
 * Vue Grab - Shared Constants
 *
 * This file contains shared configuration used across multiple scripts.
 * Loaded before popup.js and content.js to provide common values.
 */

// IDE configurations for direct file opening
// Each IDE uses a custom URL protocol to open files
const VUE_GRAB_IDE_CONFIG = {
  cursor: {
    name: 'Cursor',
    scheme: 'cursor',
    buildUrl: (filePath) => `cursor://file/${filePath || ''}`
  },
  windsurf: {
    name: 'Windsurf',
    scheme: 'windsurf',
    buildUrl: (filePath) => `windsurf://file/${filePath || ''}`
  }
};

// Configuration constants
const VUE_GRAB_CONFIG = {
  // Maximum DOM elements to scan when detecting Vue presence
  MAX_VUE_DETECTION_ELEMENTS: 100,

  // Maximum depth for component tree traversal
  MAX_COMPONENT_DEPTH: 100,

  // Maximum depth for data serialization (prevents massive output)
  MAX_SERIALIZATION_DEPTH: 5,

  // Maximum depth for vnode traversal
  MAX_VNODE_DEPTH: 50,

  // Timeout for extraction operations (ms)
  EXTRACTION_TIMEOUT: 3000,

  // Toast display duration (ms)
  TOAST_DURATION: 3000,

  // Default editor
  DEFAULT_EDITOR: 'cursor'
};

// Message types for communication between content.js and injected.js
const VUE_GRAB_MESSAGE_TYPES = {
  // content.js -> injected.js
  GET_INFO: 'VUE_GRAB_GET_INFO',
  EXTRACT: 'VUE_GRAB_EXTRACT',
  EXTRACT_CURRENT: 'VUE_GRAB_EXTRACT_CURRENT',
  NAVIGATE_PARENT: 'VUE_GRAB_NAVIGATE_PARENT',
  NAVIGATE_CHILD: 'VUE_GRAB_NAVIGATE_CHILD',

  // injected.js -> content.js
  COMPONENT_INFO: 'VUE_GRAB_COMPONENT_INFO',
  COMPONENT_DATA: 'VUE_GRAB_COMPONENT_DATA',
  NAVIGATION_RESULT: 'VUE_GRAB_NAVIGATION_RESULT'
};

// Export for environments that support it (future-proofing)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    VUE_GRAB_IDE_CONFIG,
    VUE_GRAB_CONFIG,
    VUE_GRAB_MESSAGE_TYPES
  };
}
