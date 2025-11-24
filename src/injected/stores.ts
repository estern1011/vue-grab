/**
 * State management extraction (Pinia, Vuex, and TanStack Query)
 */

import type { VueComponentInstance } from './types';
import { serializeData } from './serialization';

/**
 * Get component source code for usage detection
 */
export function getComponentSourceCode(instance: VueComponentInstance): string | null {
  try {
    if (instance.type) {
      if (instance.type.setup) {
        return instance.type.setup.toString();
      }
      if (instance.type.render) {
        return instance.type.render.toString();
      }
      return JSON.stringify(instance.type);
    }

    if (instance.$options) {
      const code: string[] = [];
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

/**
 * Extract Pinia stores
 */
export function extractPiniaStores(instance: VueComponentInstance): any {
  try {
    let pinia: any = null;

    if (instance.appContext) {
      pinia = instance.appContext.config?.globalProperties?.$pinia;
    }

    if (!pinia && instance.proxy) {
      pinia = instance.proxy.$pinia;
    }

    if (!pinia && typeof window !== 'undefined' && (window as any).pinia) {
      pinia = (window as any).pinia;
    }

    if (!pinia || !pinia._s) {
      return null;
    }

    const stores: any[] = [];
    const componentCode = getComponentSourceCode(instance);

    pinia._s.forEach((store: any, storeId: string) => {
      const storeData: any = {
        id: storeId,
        state: serializeData(store.$state),
        getters: {} as Record<string, any>,
        actions: [] as string[],
        usedByComponent: 'unknown'
      };

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

      if (componentCode) {
        // Escape special regex characters in storeId to prevent regex errors
        const escapedStoreId = storeId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const storeUsagePatterns = [
          new RegExp(`use${escapedStoreId.charAt(0).toUpperCase() + escapedStoreId.slice(1)}Store`, 'i'),
          new RegExp(`['"\`]${escapedStoreId}['"\`]`, 'i'),
          new RegExp(`\\b${escapedStoreId}\\b`)
        ];

        const definitelyUsed = storeUsagePatterns.some(pattern => pattern.test(componentCode));
        storeData.usedByComponent = definitelyUsed ? 'definitely' : 'potentially';
      }

      if (instance.setupState) {
        const hasStoreRef = Object.values(instance.setupState).some(value => {
          return value && (value as any).$id === storeId;
        });
        if (hasStoreRef) {
          storeData.usedByComponent = 'definitely';
        }
      }

      stores.push(storeData);
    });

    return stores.length > 0 ? stores : null;
  } catch (e) {
    console.debug('Vue Grab: Error extracting Pinia stores:', e);
    return null;
  }
}

/**
 * Extract Vuex store
 */
export function extractVuexStore(instance: VueComponentInstance): any {
  try {
    let store: any = null;

    if (instance.$store) {
      store = instance.$store;
    }

    if (!store && instance.proxy && instance.proxy.$store) {
      store = instance.proxy.$store;
    }

    if (!store) {
      return null;
    }

    const componentCode = getComponentSourceCode(instance);
    const storeData: any = {
      state: serializeData(store.state),
      getters: {} as Record<string, any>,
      mutations: Object.keys(store._mutations || {}),
      actions: Object.keys(store._actions || {}),
      modules: Object.keys(store._modules?.root?._children || {}),
      usedState: [] as string[],
      usedGetters: [] as string[]
    };

    Object.keys(store.getters || {}).forEach((key: string) => {
      try {
        storeData.getters[key] = serializeData(store.getters[key]);
      } catch (e) {
        storeData.getters[key] = '[Error accessing getter]';
      }
    });

    if (componentCode) {
      const statePattern = /\$store\.state\.(\w+)/g;
      let match;
      while ((match = statePattern.exec(componentCode)) !== null) {
        if (!storeData.usedState.includes(match[1])) {
          storeData.usedState.push(match[1]);
        }
      }

      const gettersPattern = /\$store\.getters\.(\w+)|\$store\.getters\[['"](\w+)['"]\]/g;
      while ((match = gettersPattern.exec(componentCode)) !== null) {
        const getter = match[1] || match[2];
        if (getter && !storeData.usedGetters.includes(getter)) {
          storeData.usedGetters.push(getter);
        }
      }

      if (componentCode.includes('mapState') || componentCode.includes('mapGetters')) {
        storeData.likelyUsesMappedHelpers = true;
      }
    }

    return storeData;
  } catch (e) {
    console.debug('Vue Grab: Error extracting Vuex store:', e);
    return null;
  }
}

/**
 * Extract TanStack queries
 */
export function extractTanStackQueries(instance: VueComponentInstance): any {
  try {
    let queryClient: any = null;

    if (instance.proxy && instance.proxy.$queryClient) {
      queryClient = instance.proxy.$queryClient;
    }

    if (!queryClient && typeof window !== 'undefined') {
      if (instance.appContext?.config?.globalProperties?.$queryClient) {
        queryClient = instance.appContext.config.globalProperties.$queryClient;
      }

      if (!queryClient && (window as any).__VUE_QUERY_CLIENT__) {
        queryClient = (window as any).__VUE_QUERY_CLIENT__;
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
    const queries: any[] = [];

    allQueries.forEach((query: any) => {
      const queryData: any = {
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
        usedByComponent: 'unknown' as 'unknown' | 'definitely' | 'potentially'
      };

      if (componentCode && Array.isArray(query.queryKey)) {
        const keyString = JSON.stringify(query.queryKey);
        const firstKey = query.queryKey[0];

        if (componentCode.includes(keyString) ||
            (typeof firstKey === 'string' && componentCode.includes(firstKey))) {
          queryData.usedByComponent = 'definitely';
        } else {
          queryData.usedByComponent = 'potentially';
        }
      }

      if (instance.setupState) {
        const hasQueryRef = Object.values(instance.setupState).some(value => {
          return value && (value as any).queryKey &&
                 JSON.stringify((value as any).queryKey) === JSON.stringify(query.queryKey);
        });
        if (hasQueryRef) {
          queryData.usedByComponent = 'definitely';
        }
      }

      queries.push(queryData);
    });

    queries.sort((a: any, b: any) => {
      const order: Record<string, number> = { definitely: 0, potentially: 1, unknown: 2 };
      return (order[a.usedByComponent] ?? 2) - (order[b.usedByComponent] ?? 2);
    });

    return queries.length > 0 ? queries : null;
  } catch (e) {
    console.debug('Vue Grab: Error extracting TanStack queries:', e);
    return null;
  }
}
