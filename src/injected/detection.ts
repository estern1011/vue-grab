/**
 * Vue detection and component discovery utilities
 */

import type { VueComponentInstance, VNode, HierarchyItem } from './types';

// Configuration constants
const MAX_VUE_DETECTION_ELEMENTS = 100;
const MAX_COMPONENT_DEPTH = 100;
const MAX_VNODE_DEPTH = 50;

/**
 * Check if Vue is present on the page
 */
export function detectVuePresence(): { found: boolean; version: string | null; devtoolsEnabled: boolean } {
  const result: { found: boolean; version: string | null; devtoolsEnabled: boolean } = {
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
    for (let i = 0; i < Math.min(testElements.length, MAX_VUE_DETECTION_ELEMENTS); i++) {
      const el = testElements[i] as HTMLElement;
      if (el.__vue__ || el.__vueParentComponent || el.__vnode) {
        result.found = true;
        result.version = el.__vue__ ? '2.x' : '3.x';
        break;
      }
    }
  }

  return result;
}

/**
 * Find the Vue component that owns a given DOM element.
 *
 * Strategy:
 * 1. Walk up the DOM tree collecting all components found via __vueParentComponent
 * 2. For each candidate, search its children to find the deepest component containing the element
 * 3. Fall back to DevTools hook for top-down search if DOM walking fails
 */
export function getVueComponentInfo(element: HTMLElement): { name: string; instance: VueComponentInstance } | null {
  let instance: VueComponentInstance | null = null;
  let allCandidates: VueComponentInstance[] = [];

  // Walk up DOM to collect all Vue component instances we encounter
  let currentEl: HTMLElement | null = element;
  let depth = 0;
  const maxDepth = MAX_COMPONENT_DEPTH;

  while (currentEl && depth < maxDepth) {
    let foundInstance: VueComponentInstance | null = null;

    // Vue 3: __vueParentComponent is set on component root elements
    if (currentEl.__vueParentComponent) {
      foundInstance = currentEl.__vueParentComponent;
    }
    // Vue 3 alternative: check vnode
    else if (currentEl.__vnode?.component) {
      foundInstance = currentEl.__vnode.component;
    }
    // Vue 2: __vue__ is set on component root elements
    else if (currentEl.__vue__) {
      foundInstance = currentEl.__vue__;
    }

    if (foundInstance && !allCandidates.includes(foundInstance)) {
      allCandidates.push(foundInstance);
    }

    currentEl = currentEl.parentElement;
    depth++;
  }

  // Start with the closest component (first found walking up)
  if (allCandidates.length > 0) {
    instance = allCandidates[0] ?? null;

    // Search each candidate's children for a deeper component containing the element
    for (const candidate of allCandidates) {
      const deeperInstance = findDeepestChildContaining(candidate, element, new Set());
      if (deeperInstance) {
        instance = deeperInstance;
        break;
      }
    }
  }

  // Fallback: use DevTools hook for top-down traversal
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

/**
 * Recursively find the deepest child component that contains the target element.
 */
export function findDeepestChildContaining(
  instance: VueComponentInstance,
  targetElement: HTMLElement,
  visited: Set<VueComponentInstance> = new Set()
): VueComponentInstance | null {
  if (!instance || visited.has(instance)) return null;
  visited.add(instance);

  const children = getChildComponents(instance);

  for (const child of children) {
    if (componentContainsElement(child, targetElement)) {
      // Found a child that contains the element - recurse to find even deeper
      const deeper = findDeepestChildContaining(child, targetElement, visited);
      return deeper || child;
    }
  }

  return null;
}

/**
 * Get all immediate child components of a Vue component instance.
 * Traverses the vnode tree to find component children.
 */
export function getChildComponents(instance: VueComponentInstance): VueComponentInstance[] {
  const children: VueComponentInstance[] = [];
  const visitedVnodes = new Set<any>();
  const visitedInstances = new Set<VueComponentInstance>();

  function collectFromVNode(vnode: any, depth: number = 0): void {
    if (!vnode || depth > MAX_VNODE_DEPTH) return;

    // Handle arrays of vnodes
    if (Array.isArray(vnode)) {
      for (const v of vnode) {
        collectFromVNode(v, depth);
      }
      return;
    }

    // Skip non-objects
    if (typeof vnode !== 'object') return;

    // Skip already visited
    if (visitedVnodes.has(vnode)) return;
    visitedVnodes.add(vnode);

    // If this vnode has a component instance, add it
    if (vnode.component && !visitedInstances.has(vnode.component)) {
      visitedInstances.add(vnode.component);
      children.push(vnode.component);
      // Don't traverse into component's internal tree - we want immediate children only
      return;
    }

    // Traverse children array
    if (vnode.children) {
      if (Array.isArray(vnode.children)) {
        for (const child of vnode.children) {
          collectFromVNode(child, depth + 1);
        }
      } else if (typeof vnode.children === 'object') {
        // Could be a single vnode
        collectFromVNode(vnode.children, depth + 1);
      }
    }

    // Traverse dynamic children (optimized path in Vue 3)
    if (vnode.dynamicChildren && Array.isArray(vnode.dynamicChildren)) {
      for (const child of vnode.dynamicChildren) {
        collectFromVNode(child, depth + 1);
      }
    }

    // Check for component in shapeFlag (Vue 3 internal)
    if (vnode.shapeFlag && vnode.component) {
      if (!visitedInstances.has(vnode.component)) {
        visitedInstances.add(vnode.component);
        children.push(vnode.component);
      }
    }
  }

  // Vue 3: traverse subTree (the rendered vnode tree)
  if (instance.subTree) {
    collectFromVNode(instance.subTree);
  }

  // Also check the vnode itself
  if (instance.vnode) {
    collectFromVNode(instance.vnode);
  }

  // Vue 2: use $children directly
  if (instance.$children && Array.isArray(instance.$children)) {
    for (const child of instance.$children) {
      if (!visitedInstances.has(child)) {
        visitedInstances.add(child);
        children.push(child);
      }
    }
  }

  return children;
}

/**
 * Check if a component's rendered DOM contains the target element
 */
export function componentContainsElement(instance: VueComponentInstance, targetElement: HTMLElement): boolean {
  // Get all possible root elements for this component
  const elements = getComponentElements(instance);

  for (const el of elements) {
    if (el === targetElement) return true;
    if (el && el.contains && el.contains(targetElement)) return true;
  }

  return false;
}

/**
 * Get all DOM elements that a component renders to
 */
export function getComponentElements(instance: VueComponentInstance): HTMLElement[] {
  const elements: HTMLElement[] = [];

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

/**
 * Collect DOM elements from a vnode tree
 */
export function collectElements(vnode: VNode | null, elements: HTMLElement[]): void {
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

/**
 * Find component via DevTools hook
 */
export function findComponentViaDevtoolsHook(element: HTMLElement, hook: any): VueComponentInstance | null {
  try {
    const apps = hook.apps;
    if (apps) {
      const appList = apps instanceof Set ? Array.from(apps) :
                      apps instanceof Map ? Array.from(apps.values()) :
                      Array.isArray(apps) ? apps : [];

      for (const app of appList) {
        let rootInstance = app._instance || app.$root?._instance;

        if (!rootInstance && hook.appRecords) {
          const appRecord = hook.appRecords.find((r: any) => r.app === app);
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

/**
 * Get the name of a component instance
 */
export function getComponentName(instance: VueComponentInstance): string {
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

/**
 * Get element attributes (filtering out Vue Grab internal attributes)
 */
export function getElementAttributes(element: HTMLElement): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const attr of Array.from(element.attributes)) {
    if (!attr.name.startsWith('data-vue-grab')) {
      attrs[attr.name] = attr.value;
    }
  }
  return attrs;
}

/**
 * Build hierarchy from root to current component
 */
export function buildComponentHierarchy(instance: VueComponentInstance): HierarchyItem[] {
  const hierarchy: HierarchyItem[] = [];
  let current: VueComponentInstance | undefined = instance;

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
