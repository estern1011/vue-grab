/**
 * Vue feature extraction (router, provide/inject, emitted events, slots)
 */

import type { VueComponentInstance } from './types';
import { serializeData, serializeVNodes } from './serialization';
import { getComponentSourceCode } from './stores';

/**
 * Extract Vue Router state
 */
export function extractRouterState(instance: VueComponentInstance): any {
  try {
    let route: any = null;

    // Vue 3 - Composition API
    if (instance.proxy) {
      route = instance.proxy.$route;
    }

    // Vue 3 - App context
    if (!route && instance.appContext?.config?.globalProperties) {
      route = instance.appContext.config.globalProperties.$route;
    }

    // Vue 2
    if (!route && instance.$route) {
      route = instance.$route;
    }

    // Check setupState for useRoute/useRouter
    if (!route && instance.setupState) {
      for (const key of Object.keys(instance.setupState)) {
        const value = instance.setupState[key];
        if (value && value.path !== undefined && value.params !== undefined) {
          route = value;
          break;
        }
      }
    }

    if (!route) return null;

    return {
      path: route.path,
      name: route.name || null,
      fullPath: route.fullPath,
      params: serializeData(route.params),
      query: serializeData(route.query),
      hash: route.hash || null,
      meta: serializeData(route.meta),
      matched: route.matched?.map((m: any) => ({
        path: m.path,
        name: m.name,
        components: Object.keys(m.components || {})
      })) || [],
      redirectedFrom: route.redirectedFrom?.fullPath || null
    };
  } catch (e) {
    console.debug('Vue Grab: Error extracting router state:', e);
    return null;
  }
}

/**
 * Extract values provided by this component
 */
export function extractProvidedValues(instance: VueComponentInstance): any {
  try {
    let provided: Record<string, any> | null = null;

    // Vue 3
    if (instance.provides) {
      // Get only values provided by THIS component, not inherited
      const parentProvides = instance.parent?.provides || {};
      provided = {};

      for (const key of Object.keys(instance.provides)) {
        // Only include if it's different from parent's provides (meaning this component provided it)
        if (instance.provides[key] !== parentProvides[key]) {
          provided[key] = serializeData(instance.provides[key]);
        }
      }
    }

    // Vue 2
    if (instance._provided) {
      provided = serializeData(instance._provided);
    }

    return provided && Object.keys(provided).length > 0 ? provided : null;
  } catch (e) {
    console.debug('Vue Grab: Error extracting provided values:', e);
    return null;
  }
}

/**
 * Extract values injected into this component
 */
export function extractInjectedValues(instance: VueComponentInstance): any {
  try {
    const injected: Record<string, any> = {};

    // Vue 3 - Check inject option
    if (instance.type?.inject) {
      const injectOptions = instance.type.inject;
      const injectKeys = Array.isArray(injectOptions)
        ? injectOptions
        : Object.keys(injectOptions);

      for (const key of injectKeys) {
        if (instance.proxy && key in instance.proxy) {
          injected[key] = serializeData(instance.proxy[key]);
        }
      }
    }

    // Vue 2
    if (instance.$options?.inject) {
      const injectOptions = instance.$options.inject;
      const injectKeys = Array.isArray(injectOptions)
        ? injectOptions
        : Object.keys(injectOptions);

      for (const key of injectKeys) {
        if (key in instance) {
          injected[key] = serializeData((instance as any)[key]);
        }
      }
    }

    return Object.keys(injected).length > 0 ? injected : null;
  } catch (e) {
    console.debug('Vue Grab: Error extracting injected values:', e);
    return null;
  }
}

/**
 * Extract emitted events this component can emit
 */
export function extractEmittedEvents(instance: VueComponentInstance): string[] | null {
  try {
    const events: string[] = [];

    // Vue 3 - emits option
    if (instance.type?.emits) {
      const emits = instance.type.emits;
      if (Array.isArray(emits)) {
        events.push(...emits);
      } else if (typeof emits === 'object') {
        events.push(...Object.keys(emits));
      }
    }

    // Vue 3 - Check emitsOptions on instance
    if ((instance as any).emitsOptions) {
      const emits = (instance as any).emitsOptions;
      if (typeof emits === 'object') {
        events.push(...Object.keys(emits).filter(e => !events.includes(e)));
      }
    }

    // Vue 2
    if (instance.$options?.emits) {
      const emits = instance.$options.emits;
      if (Array.isArray(emits)) {
        events.push(...emits.filter((e: string) => !events.includes(e)));
      } else if (typeof emits === 'object') {
        events.push(...Object.keys(emits).filter(e => !events.includes(e)));
      }
    }

    // Check for $emit calls in component source (heuristic)
    const componentCode = getComponentSourceCode(instance);
    if (componentCode) {
      const emitPattern = /\$emit\(['"]([^'"]+)['"]/g;
      const emit2Pattern = /emit\(['"]([^'"]+)['"]/g;
      let match;

      while ((match = emitPattern.exec(componentCode)) !== null) {
        if (match[1] && !events.includes(match[1])) {
          events.push(match[1]);
        }
      }

      while ((match = emit2Pattern.exec(componentCode)) !== null) {
        if (match[1] && !events.includes(match[1])) {
          events.push(match[1]);
        }
      }
    }

    return events.length > 0 ? events : null;
  } catch (e) {
    console.debug('Vue Grab: Error extracting emitted events:', e);
    return null;
  }
}

/**
 * Extract slot content
 */
export function extractSlots(instance: VueComponentInstance): any {
  try {
    const slots: Record<string, any> = {};

    // Vue 3
    if (instance.slots) {
      for (const slotName of Object.keys(instance.slots)) {
        const slotFn = instance.slots[slotName];
        if (typeof slotFn === 'function') {
          try {
            const vnodes = slotFn();
            slots[slotName] = serializeVNodes(vnodes);
          } catch (e) {
            slots[slotName] = '[Slot function - requires props]';
          }
        }
      }
    }

    // Vue 2
    if (instance.$slots) {
      for (const slotName of Object.keys(instance.$slots)) {
        const vnodes = instance.$slots[slotName];
        if (vnodes) {
          slots[slotName] = serializeVNodes(vnodes);
        }
      }
    }

    // Vue 2 scoped slots
    if (instance.$scopedSlots) {
      for (const slotName of Object.keys(instance.$scopedSlots)) {
        if (!slots[slotName]) {
          slots[slotName] = '[Scoped slot]';
        }
      }
    }

    return Object.keys(slots).length > 0 ? slots : null;
  } catch (e) {
    console.debug('Vue Grab: Error extracting slots:', e);
    return null;
  }
}
