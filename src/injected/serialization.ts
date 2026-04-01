/**
 * Data serialization utilities for Vue Grab
 */

import type { VNode } from './types';

// Configuration constants
const MAX_SERIALIZATION_DEPTH = 5;

/**
 * Serialize data for safe transmission and storage
 * Handles circular references, functions, and complex objects
 */
export function serializeData(obj: any): any {
  if (!obj) return null;

  try {
    const seen = new WeakSet<any>();

    const serialize = (value: any, depth: number = 0): any => {
      if (depth > MAX_SERIALIZATION_DEPTH) return '[Deep Object]';

      if (value === null) return null;
      if (value === undefined) return undefined;

      if (typeof value !== 'object' && typeof value !== 'function') {
        return value;
      }

      if (typeof value === 'function') {
        return `[Function: ${value.name || 'anonymous'}]`;
      }

      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);

      // Unwrap Vue refs (have __v_isRef flag and .value)
      if (value && '__v_isRef' in value && 'value' in value) {
        return serialize(value.value, depth);
      }

      if (Array.isArray(value)) {
        return value.map(item => serialize(item, depth + 1));
      }

      if (value instanceof HTMLElement) {
        return `[HTMLElement: ${value.tagName.toLowerCase()}]`;
      }

      if (value instanceof Date) {
        return value.toISOString();
      }

      if (value instanceof Map) {
        const mapObj: Record<string, any> = {};
        value.forEach((v, k) => {
          mapObj[String(k)] = serialize(v, depth + 1);
        });
        return mapObj;
      }

      if (value instanceof Set) {
        return Array.from(value).map(item => serialize(item, depth + 1));
      }

      if (value instanceof RegExp) {
        return value.toString();
      }

      // Use Object.keys instead of for...in to work better with Vue proxies
      const result: Record<string, any> = {};
      let keys: string[];
      try {
        keys = Object.keys(value);
      } catch {
        return '[Unserializable]';
      }
      for (const key of keys) {
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
    console.debug('Vue Grab: Serialization error:', e);
    return { error: 'Could not serialize data' };
  }
}

/**
 * Serialize VNodes to readable format
 */
export function serializeVNodes(vnodes: VNode | VNode[] | null): any {
  if (!vnodes) return null;

  const nodes = Array.isArray(vnodes) ? vnodes : [vnodes];
  const result: any[] = [];

  for (const vnode of nodes) {
    if (!vnode) continue;

    if (typeof vnode === 'string' || typeof vnode === 'number') {
      result.push({ type: 'text', content: String(vnode) });
      continue;
    }

    // Handle Vue 3 vnodes
    if ((vnode as VNode).type) {
      const vnodeTyped = vnode as VNode;
      const nodeInfo: any = {
        type: typeof vnodeTyped.type === 'string'
          ? vnodeTyped.type
          : vnodeTyped.type?.name || vnodeTyped.type?.__name || 'Component'
      };

      if (vnodeTyped.props && Object.keys(vnodeTyped.props).length > 0) {
        nodeInfo.props = serializeData(vnodeTyped.props);
      }

      if (vnodeTyped.children) {
        if (typeof vnodeTyped.children === 'string') {
          nodeInfo.content = vnodeTyped.children;
        } else if (Array.isArray(vnodeTyped.children)) {
          nodeInfo.children = serializeVNodes(vnodeTyped.children);
        }
      }

      result.push(nodeInfo);
    }

    // Handle Vue 2 vnodes
    if ((vnode as VNode).tag) {
      const vnodeTyped = vnode as VNode;
      const nodeInfo: any = {
        type: vnodeTyped.componentOptions?.tag || vnodeTyped.tag
      };

      if (vnodeTyped.data?.attrs) {
        nodeInfo.props = serializeData(vnodeTyped.data.attrs);
      }

      if (vnodeTyped.children) {
        nodeInfo.children = serializeVNodes(vnodeTyped.children as VNode[]);
      }

      if (vnodeTyped.text) {
        nodeInfo.content = vnodeTyped.text;
      }

      result.push(nodeInfo);
    }
  }

  return result.length > 0 ? result : null;
}
