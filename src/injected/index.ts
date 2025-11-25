/**
 * Vue Grab - Injected Script
 *
 * This script runs in the page context (not the extension's isolated world)
 * so it can access Vue's internal properties on DOM elements.
 *
 * Architecture:
 * - content.js (content script) handles UI and user interaction
 * - injected.js (this file) accesses Vue internals and extracts component data
 * - Communication uses a private DOM event bridge
 *
 * Message Types (content.js → injected.js):
 * - VUE_GRAB_GET_INFO: Get component info for a hovered element
 * - VUE_GRAB_EXTRACT: Extract full component data for an element
 * - VUE_GRAB_EXTRACT_CURRENT: Extract data for the currently navigated component
 * - VUE_GRAB_NAVIGATE_PARENT: Navigate up the component hierarchy
 * - VUE_GRAB_NAVIGATE_CHILD: Navigate down the component hierarchy
 *
 * Response Types (injected.js → content.js):
 * - VUE_GRAB_COMPONENT_INFO: Component name and hierarchy for hover display
 * - VUE_GRAB_COMPONENT_DATA: Full extracted component data
 * - VUE_GRAB_NAVIGATION_RESULT: Updated hierarchy after navigation
 *
 * Vue Detection:
 * - Vue 3: Uses __vueParentComponent on DOM elements
 * - Vue 2: Uses __vue__ on DOM elements
 * - Fallback: Uses __VUE_DEVTOOLS_GLOBAL_HOOK__ for top-down traversal
 */

import type { BridgeRequestMessage, BridgeResponseMessage, HierarchyItem } from './types';
import { detectVuePresence, getVueComponentInfo, buildComponentHierarchy } from './detection';
import { extractVueComponent, extractFromInstance } from './extraction';

(function() {
  'use strict';

  // Track current component and its hierarchy for navigation
  let currentComponentStack: HierarchyItem[] = [];
  let currentStackIndex = -1;

  const bridgeElement = document.querySelector('[data-vue-grab-bridge="true"]') as HTMLElement | null;

  if (!bridgeElement) {
    console.error('Vue Grab: Unable to establish communication bridge.');
    return;
  }

  const requestEvent = bridgeElement.getAttribute('data-request-event');
  const responseEvent = bridgeElement.getAttribute('data-response-event');

  if (!bridgeElement.id || !requestEvent || !responseEvent) {
    console.error('Vue Grab: Bridge metadata missing. Cannot communicate with content script.');
    return;
  }

  const handshake = {
    bridgeId: bridgeElement.id,
    requestEvent,
    responseEvent
  };

  bridgeElement.addEventListener(handshake.requestEvent, (event) => {
    const detail = (event as CustomEvent<BridgeRequestMessage>).detail;
    if (!detail) return;

    if (detail.type === 'VUE_GRAB_GET_INFO') {
      const element = document.querySelector(`[data-vue-grab-id="${detail.elementId}"]`) as HTMLElement | null;
      if (element) {
        const info = getVueComponentInfo(element);
        if (info) {
          currentComponentStack = buildComponentHierarchy(info.instance);
          currentStackIndex = currentComponentStack.length - 1;
        } else {
          currentComponentStack = [];
          currentStackIndex = -1;
        }

        emitResponse({
          type: 'VUE_GRAB_COMPONENT_INFO',
          info: info ? {
            name: info.name,
            hierarchy: currentComponentStack.map(c => c.name),
            currentIndex: currentStackIndex
          } : null
        });
      }
    } else if (detail.type === 'VUE_GRAB_EXTRACT') {
      const element = document.querySelector(`[data-vue-grab-id="${detail.elementId}"]`) as HTMLElement | null;
      if (element) {
        const data = extractVueComponent(element);
        const vueStatus = detectVuePresence();

        let error = null;
        if (!data) {
          if (!vueStatus.found) {
            error = 'No Vue.js detected on this page';
          } else if (!vueStatus.devtoolsEnabled) {
            error = 'Vue found but devtools not enabled. Try refreshing the page.';
          } else {
            error = 'No Vue component found. Try clicking on a different element.';
          }
        }

        emitResponse({
          type: 'VUE_GRAB_COMPONENT_DATA',
          data,
          error
        });
      }
    } else if (detail.type === 'VUE_GRAB_NAVIGATE_PARENT') {
      if (currentStackIndex > 0) {
        currentStackIndex--;
        const parentComponent = currentComponentStack[currentStackIndex];
        if (parentComponent) {
          emitResponse({
            type: 'VUE_GRAB_NAVIGATION_RESULT',
            info: {
              name: parentComponent.name,
              hierarchy: currentComponentStack.map(c => c.name),
              currentIndex: currentStackIndex
            }
          });
        }
      } else {
        emitResponse({
          type: 'VUE_GRAB_NAVIGATION_RESULT',
          info: null,
          error: 'Already at root component'
        });
      }
    } else if (detail.type === 'VUE_GRAB_NAVIGATE_CHILD') {
      if (currentStackIndex < currentComponentStack.length - 1) {
        currentStackIndex++;
        const childComponent = currentComponentStack[currentStackIndex];
        if (childComponent) {
          emitResponse({
            type: 'VUE_GRAB_NAVIGATION_RESULT',
            info: {
              name: childComponent.name,
              hierarchy: currentComponentStack.map(c => c.name),
              currentIndex: currentStackIndex
            }
          });
        }
      } else {
        emitResponse({
          type: 'VUE_GRAB_NAVIGATION_RESULT',
          info: null,
          error: 'Already at clicked element'
        });
      }
    } else if (detail.type === 'VUE_GRAB_EXTRACT_CURRENT') {
      const componentInfo = currentComponentStack[currentStackIndex];
      if (currentStackIndex >= 0 && componentInfo) {
        const data = extractFromInstance(componentInfo.instance);
        emitResponse({
          type: 'VUE_GRAB_COMPONENT_DATA',
          data,
          error: data ? null : 'Could not extract component data'
        });
      } else {
        emitResponse({
          type: 'VUE_GRAB_COMPONENT_DATA',
          data: null,
          error: 'No component selected'
        });
      }
    }
  });

  function emitResponse(detail: BridgeResponseMessage): void {
    if (!bridgeElement) return;
    const event = new CustomEvent(handshake.responseEvent, {
      detail,
      bubbles: false,
      composed: false
    });
    bridgeElement.dispatchEvent(event);
  }

  // Signal that the injected script is ready
  console.debug('Vue Grab: Injected script loaded');
})();
