/**
 * Global type declarations for Vue Grab
 * Extends Window and Element interfaces to include Vue runtime properties
 */

// Extend Window interface for Vue and extension-specific properties
declare global {
  interface Window {
    // Vue 3 properties
    __VUE__?: any;
    __VUE_DEVTOOLS_GLOBAL_HOOK__?: any;

    // Vue 2 properties
    Vue?: any;

    // Pinia
    pinia?: any;

    // TanStack Query
    __VUE_QUERY_CLIENT__?: any;

    // Extension-specific
    _vueGrabExtractionTimeout?: number;
  }

  // Extend Element interface for Vue properties
  interface Element {
    // Vue 3 properties
    __vueParentComponent?: any;
    __vnode?: any;

    // Vue 2 properties
    __vue__?: any;
  }
}

export {};
