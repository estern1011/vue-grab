/**
 * Vue Grab - Shared Constants
 *
 * This file contains shared configuration used across multiple scripts.
 * Type-safe constants for IDE configurations, application settings, and message types.
 */

import type { IDEConfigMap, VueGrabConfig, MessageTypes } from './types';

// IDE configurations for direct file opening
// Each IDE uses a custom URL protocol to open files
export const VUE_GRAB_IDE_CONFIG: IDEConfigMap = {
  cursor: {
    name: 'Cursor',
    scheme: 'cursor',
    buildUrl: (filePath: string): string => `cursor://file/${filePath || ''}`
  },
  windsurf: {
    name: 'Windsurf',
    scheme: 'windsurf',
    buildUrl: (filePath: string): string => `windsurf://file/${filePath || ''}`
  }
};

// Configuration constants
export const VUE_GRAB_CONFIG: VueGrabConfig = {
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
export const VUE_GRAB_MESSAGE_TYPES: MessageTypes = {
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
