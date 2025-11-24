/**
 * Vue Grab - TypeScript Type Definitions
 *
 * Type definitions for Vue Grab extension interfaces and data structures.
 * These types document the structure of data extracted from Vue components.
 */

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * IDE configuration for opening files in different editors
 */
export interface IDEConfig {
  name: string;
  scheme: string;
  buildUrl: (filePath: string) => string;
}

/**
 * Collection of supported IDE configurations
 */
export interface IDEConfigMap {
  cursor: IDEConfig;
  windsurf: IDEConfig;
  [key: string]: IDEConfig;
}

/**
 * Application configuration constants
 */
export interface VueGrabConfig {
  MAX_VUE_DETECTION_ELEMENTS: number;
  MAX_COMPONENT_DEPTH: number;
  MAX_SERIALIZATION_DEPTH: number;
  MAX_VNODE_DEPTH: number;
  EXTRACTION_TIMEOUT: number;
  TOAST_DURATION: number;
  DEFAULT_EDITOR: string;
}

/**
 * Message types for cross-context communication
 */
export interface MessageTypes {
  GET_INFO: string;
  EXTRACT: string;
  EXTRACT_CURRENT: string;
  NAVIGATE_PARENT: string;
  NAVIGATE_CHILD: string;
  COMPONENT_INFO: string;
  COMPONENT_DATA: string;
  NAVIGATION_RESULT: string;
}

// ============================================================================
// Component Data Types
// ============================================================================

/**
 * Element information for a DOM element
 */
export interface ElementInfo {
  tagName: string;
  id: string | null;
  classes: string[];
  attributes: Record<string, string>;
}

/**
 * Pinia store data
 */
export interface PiniaStoreData {
  id: string;
  state: Record<string, any>;
  getters: Record<string, any>;
  actions: string[];
  usedByComponent: 'definitely' | 'potentially' | 'unknown';
}

/**
 * Vuex store data
 */
export interface VuexStoreData {
  state: Record<string, any>;
  getters: Record<string, any>;
  mutations: string[];
  actions: string[];
  modules: string[];
  usedState: string[];
  usedGetters: string[];
  likelyUsesMappedHelpers?: boolean;
}

/**
 * TanStack Query data
 */
export interface TanStackQueryData {
  queryKey: any[];
  queryHash: string;
  state: {
    status: 'idle' | 'loading' | 'success' | 'error';
    fetchStatus: string;
    dataUpdateCount: number;
    errorUpdateCount: number;
  };
  data: any;
  error: string | null;
  lastUpdated: string | null;
  usedByComponent: 'definitely' | 'potentially' | 'unknown';
}

/**
 * Vue Router state information
 */
export interface RouterState {
  path: string;
  name: string | null;
  fullPath: string;
  params: Record<string, any>;
  query: Record<string, any>;
  hash: string | null;
  meta: Record<string, any>;
  matched: Array<{
    path: string;
    name: string;
    components: string[];
  }>;
  redirectedFrom: string | null;
}

/**
 * VNode serialized structure
 */
export interface SerializedVNode {
  type: string;
  props?: Record<string, any>;
  content?: string;
  children?: SerializedVNode[];
}

/**
 * Complete component data extracted from a Vue component
 */
export interface ComponentData {
  componentName: string;
  filePath: string | null;
  props: Record<string, any> | null;
  data: Record<string, any> | null;
  setupState: Record<string, any> | null;
  computed: string[] | null;
  methods: string[] | null;
  template: string | null;
  piniaStores: PiniaStoreData[] | null;
  vuexStore: VuexStoreData | null;
  tanstackQueries: TanStackQueryData[] | null;
  routerState: RouterState | null;
  providedValues: Record<string, any> | null;
  injectedValues: Record<string, any> | null;
  emittedEvents: string[] | null;
  slots: Record<string, SerializedVNode[] | string> | null;
  element: ElementInfo | null;
}

// ============================================================================
// Component Hierarchy Types
// ============================================================================

/**
 * Component hierarchy item
 */
export interface HierarchyItem {
  name: string;
  instance: any; // Vue component instance (Vue 2 or Vue 3)
}

/**
 * Component information for hover display
 */
export interface ComponentInfo {
  name: string;
  hierarchy: string[];
  currentIndex: number;
}

// ============================================================================
// Message Payload Types
// ============================================================================

/**
 * Message from content script to injected script
 */
export interface MessageToInjected {
  type: 'VUE_GRAB_GET_INFO' | 'VUE_GRAB_EXTRACT' | 'VUE_GRAB_EXTRACT_CURRENT' | 'VUE_GRAB_NAVIGATE_PARENT' | 'VUE_GRAB_NAVIGATE_CHILD';
  elementId?: string;
}

/**
 * Message from injected script to content script
 */
export interface MessageFromInjected {
  type: 'VUE_GRAB_COMPONENT_INFO' | 'VUE_GRAB_COMPONENT_DATA' | 'VUE_GRAB_NAVIGATION_RESULT';
  info?: ComponentInfo | null;
  data?: ComponentData | null;
  error?: string | null;
}

// ============================================================================
// Chrome Extension Message Types
// ============================================================================

/**
 * Message from popup to content script
 */
export interface PopupMessage {
  action: 'toggle' | 'getState' | 'getLastData' | 'setEditor' | 'formatAndDownload';
  editor?: string;
}

/**
 * Response from content script to popup
 */
export interface ContentScriptResponse {
  isActive?: boolean;
  hasData?: boolean;
  data?: ComponentData | null;
  success?: boolean;
  error?: string;
}

// ============================================================================
// Vue Detection Types
// ============================================================================

/**
 * Vue presence detection result
 */
export interface VueDetectionResult {
  found: boolean;
  version: string | null;
  devtoolsEnabled: boolean;
}

// ============================================================================
// Global Constants (available in all contexts)
// ============================================================================

declare global {
  const VUE_GRAB_IDE_CONFIG: IDEConfigMap;
  const VUE_GRAB_CONFIG: VueGrabConfig;
  const VUE_GRAB_MESSAGE_TYPES: MessageTypes;
}

export {};
