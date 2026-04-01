/**
 * Type definitions for Vue Grab injected script
 */

export interface BridgeHandshake {
  bridgeId: string;
  requestEvent: string;
  responseEvent: string;
}

export type BridgeRequestMessage =
  | { type: 'VUE_GRAB_GET_INFO'; elementId: string }
  | { type: 'VUE_GRAB_EXTRACT'; elementId: string }
  | { type: 'VUE_GRAB_EXTRACT_CURRENT' }
  | { type: 'VUE_GRAB_NAVIGATE_PARENT' }
  | { type: 'VUE_GRAB_NAVIGATE_CHILD' };

export interface ComponentInfoPayload {
  name: string;
  hierarchy: string[];
  currentIndex: number;
}

export type BridgeResponseMessage =
  | { type: 'VUE_GRAB_COMPONENT_DATA'; data: any; error?: string | null }
  | { type: 'VUE_GRAB_COMPONENT_INFO'; info: ComponentInfoPayload | null }
  | { type: 'VUE_GRAB_NAVIGATION_RESULT'; info: ComponentInfoPayload | null; error?: string | null };

// Window augmentations
declare global {
  interface Window {
    __VUE_DEVTOOLS_GLOBAL_HOOK__?: any;
    __VUE__?: any;
    Vue?: any;
    pinia?: any;
    __VUE_QUERY_CLIENT__?: any;
  }

  interface HTMLElement {
    __vueParentComponent?: VueComponentInstance;
    __vnode?: VNode;
    __vue__?: VueComponentInstance;
  }
}

/**
 * Vue component instance (Vue 2 and Vue 3 compatible)
 */
export interface VueComponentInstance {
  // Common properties
  type?: ComponentType;
  props?: Record<string, any>;
  setupState?: Record<string, any>;
  data?: Record<string, any>;
  proxy?: any;
  parent?: VueComponentInstance;
  subTree?: VNode;
  vnode?: VNode;
  appContext?: {
    config?: {
      globalProperties?: Record<string, any>;
    };
  };
  provides?: Record<string | symbol, any>;
  slots?: Record<string, (...args: any[]) => VNode[]>;

  // Vue 2 specific
  $options?: ComponentOptions;
  $parent?: VueComponentInstance;
  $children?: VueComponentInstance[];
  $el?: HTMLElement;
  $props?: Record<string, any>;
  $data?: Record<string, any>;
  $route?: any;
  $router?: any;
  $store?: any;
  $pinia?: any;
  $queryClient?: any;
  $slots?: Record<string, VNode[]>;
  $scopedSlots?: Record<string, any>;
  _provided?: Record<string, any>;
}

export interface ComponentType {
  name?: string;
  __name?: string;
  displayName?: string;
  __file?: string;
  computed?: Record<string, any>;
  methods?: Record<string, any>;
  template?: string;
  setup?: Function;
  render?: Function;
  inject?: string[] | Record<string, any>;
  emits?: string[] | Record<string, any>;
}

export interface ComponentOptions {
  name?: string;
  _componentTag?: string;
  __file?: string;
  computed?: Record<string, any>;
  methods?: Record<string, any>;
  template?: string;
  setup?: Function;
  inject?: string[] | Record<string, any>;
  emits?: string[] | Record<string, any>;
}

export interface VNode {
  type?: any;
  el?: HTMLElement;
  component?: VueComponentInstance;
  children?: VNode[] | string | null;
  props?: Record<string, any>;
  shapeFlag?: number;
  dynamicChildren?: VNode[];
  suspense?: {
    activeBranch?: VNode;
    pendingBranch?: VNode;
  };
  // Vue 2 specific
  tag?: string;
  data?: {
    attrs?: Record<string, any>;
  };
  text?: string;
  componentOptions?: {
    tag?: string;
  };
}

export interface HierarchyItem {
  name: string;
  instance: VueComponentInstance;
}
