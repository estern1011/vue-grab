/**
 * Embedded Vue Grab - standalone version that works without the Chrome extension.
 * Uses Vue's internal component instances to extract data, same as the extension.
 */

import { ref, onUnmounted } from 'vue'

export interface GrabResult {
  componentName: string
  filePath: string | null
  props: Record<string, any> | null
  state: Record<string, any> | null
  computed: string[]
  methods: string[]
  storeName: string | null
  storeState: Record<string, any> | null
}

interface HierarchyItem {
  name: string
  instance: any
  el: HTMLElement | null
}

export function useVueGrab() {
  const isActive = ref(false)
  const hoveredComponent = ref<string | null>(null)
  const grabbedItems = ref<Array<{ id: string; data: GrabResult; comment: string }>>([])
  const hierarchy = ref<string[]>([])
  const hierarchyIndex = ref(-1)

  let floatingLabel: HTMLElement | null = null
  let currentHighlight: HTMLElement | null = null
  let currentHierarchy: HierarchyItem[] = []
  let currentHierarchyIndex = -1
  let lastHoveredElement: HTMLElement | null = null
  let tabbableComponents: { el: HTMLElement; name: string; instance: any }[] = []
  let tabIndex = -1

  function activate() {
    isActive.value = true
    document.addEventListener('mouseover', onMouseOver, true)
    document.addEventListener('mouseout', onMouseOut, true)
    document.addEventListener('click', onClick, true)
    document.addEventListener('keydown', onKeyDown)
  }

  function deactivate() {
    isActive.value = false
    document.removeEventListener('mouseover', onMouseOver, true)
    document.removeEventListener('mouseout', onMouseOut, true)
    document.removeEventListener('click', onClick, true)
    document.removeEventListener('keydown', onKeyDown)
    clearHighlight()
    currentHierarchy = []
    currentHierarchyIndex = -1
    hierarchy.value = []
    hierarchyIndex.value = -1
  }

  function toggle() {
    if (isActive.value) deactivate()
    else activate()
  }

  function onMouseOver(e: MouseEvent) {
    const target = e.target as HTMLElement
    if (target.closest('.vue-grab-embedded-panel') || target.closest('.vue-grab-embedded-btn')) return

    const info = findVueComponent(target)
    if (!info) return

    clearHighlight()
    lastHoveredElement = target
    tabIndex = -1 // Reset tab cycling when mouse takes over

    // Build hierarchy from root down to the hovered component
    currentHierarchy = buildHierarchy(info.instance)
    currentHierarchyIndex = currentHierarchy.length - 1
    syncHierarchyRefs()

    highlightElement(target)
    hoveredComponent.value = info.name
    showLabel(target, info.name)
  }

  function onMouseOut(e: MouseEvent) {
    const target = e.target as HTMLElement
    if (target.closest('.vue-grab-embedded-panel')) return
    clearHighlight()
    hoveredComponent.value = null
    currentHierarchy = []
    currentHierarchyIndex = -1
    hierarchy.value = []
    hierarchyIndex.value = -1
  }

  function onClick(e: MouseEvent) {
    const target = e.target as HTMLElement
    if (target.closest('.vue-grab-embedded-panel') || target.closest('.vue-grab-embedded-btn')) return

    e.preventDefault()
    e.stopPropagation()

    // If navigated to a parent, grab the component at the current hierarchy index
    const item = currentHierarchy[currentHierarchyIndex]
    if (item) {
      const result = extractFromInstance(item.instance, item.name)
      if (result) {
        grabbedItems.value.push({
          id: Math.random().toString(36).slice(2),
          data: result,
          comment: '',
        })
      }
    } else {
      // Fallback to extracting from the clicked element directly
      const result = extractFromElement(target)
      if (result) {
        grabbedItems.value.push({
          id: Math.random().toString(36).slice(2),
          data: result,
          comment: '',
        })
      }
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      deactivate()
      return
    }

    // Enter: grab the currently highlighted component
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      grabCurrentComponent()
      return
    }

    // Tab / Shift+Tab: cycle through visible Vue components
    if (e.key === 'Tab') {
      e.preventDefault()
      e.stopPropagation()
      cycleComponents(e.shiftKey ? -1 : 1)
      return
    }

    // Alt+Arrow: hierarchy navigation
    if (e.altKey && e.key === 'ArrowUp') {
      e.preventDefault()
      e.stopPropagation()
      if (currentHierarchy.length > 0 && currentHierarchyIndex > 0) {
        currentHierarchyIndex--
        applyHierarchyNavigation()
      }
      return
    }

    if (e.altKey && e.key === 'ArrowDown') {
      e.preventDefault()
      e.stopPropagation()
      if (currentHierarchy.length > 0 && currentHierarchyIndex < currentHierarchy.length - 1) {
        currentHierarchyIndex++
        applyHierarchyNavigation()
      }
      return
    }
  }

  function grabCurrentComponent() {
    const item = currentHierarchy[currentHierarchyIndex]
    if (item) {
      const result = extractFromInstance(item.instance, item.name)
      if (result) {
        grabbedItems.value.push({
          id: Math.random().toString(36).slice(2),
          data: result,
          comment: '',
        })
      }
    }
  }

  function cycleComponents(direction: 1 | -1) {
    // Rebuild the list of tabbable components each time (DOM may have changed)
    tabbableComponents = collectVisibleComponents()
    if (tabbableComponents.length === 0) return

    tabIndex += direction
    if (tabIndex >= tabbableComponents.length) tabIndex = 0
    if (tabIndex < 0) tabIndex = tabbableComponents.length - 1

    const target = tabbableComponents[tabIndex]
    clearHighlight()
    lastHoveredElement = target.el

    currentHierarchy = buildHierarchy(target.instance)
    currentHierarchyIndex = currentHierarchy.length - 1
    syncHierarchyRefs()

    highlightElement(target.el)
    hoveredComponent.value = target.name
    showLabel(target.el, target.name)

    // Scroll into view if needed
    target.el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }

  function collectVisibleComponents(): { el: HTMLElement; name: string; instance: any }[] {
    const results: { el: HTMLElement; name: string; instance: any }[] = []
    const seen = new WeakSet()

    // Walk all elements inside the demo app area
    const demoRoot = document.querySelector('.vue-grab-embedded-panel')
      ? document.body
      : document.querySelector('#try-it') || document.body

    const walker = document.createTreeWalker(demoRoot, NodeFilter.SHOW_ELEMENT)
    let node: Node | null = walker.currentNode
    while (node) {
      const el = node as HTMLElement
      if (el.closest?.('.vue-grab-embedded-panel') || el.closest?.('.vue-grab-embedded-btn')) {
        node = walker.nextNode()
        continue
      }
      const inst = (el as any).__vueParentComponent
      if (inst && !seen.has(inst)) {
        seen.add(inst)
        const name = inst.type?.name || inst.type?.__name || 'Anonymous'
        if (name !== 'Anonymous') {
          const rect = el.getBoundingClientRect()
          // Only include visible elements with non-zero dimensions
          if (rect.width > 0 && rect.height > 0) {
            results.push({ el, name, instance: inst })
          }
        }
      }
      node = walker.nextNode()
    }
    return results
  }

  function applyHierarchyNavigation() {
    const item = currentHierarchy[currentHierarchyIndex]
    if (!item) return

    syncHierarchyRefs()
    hoveredComponent.value = item.name

    // Try to highlight the component's root element
    clearHighlight()
    const el = getComponentElement(item.instance)
    if (el) {
      highlightElement(el)
      showLabel(el, item.name)
    } else if (lastHoveredElement) {
      highlightElement(lastHoveredElement)
      showLabel(lastHoveredElement, item.name)
    }
  }

  function syncHierarchyRefs() {
    hierarchy.value = currentHierarchy.map(h => h.name)
    hierarchyIndex.value = currentHierarchyIndex
  }

  function highlightElement(el: HTMLElement) {
    currentHighlight = el
    el.style.outline = '2px solid #42b883'
    el.style.outlineOffset = '2px'
    el.style.cursor = 'crosshair'
  }

  function clearHighlight() {
    if (currentHighlight) {
      currentHighlight.style.outline = ''
      currentHighlight.style.outlineOffset = ''
      currentHighlight.style.cursor = ''
      currentHighlight = null
    }
    hideLabel()
  }

  function showLabel(el: HTMLElement, name: string) {
    hideLabel()
    floatingLabel = document.createElement('div')
    floatingLabel.className = 'vue-grab-embedded-label'
    floatingLabel.textContent = name
    document.body.appendChild(floatingLabel)

    const rect = el.getBoundingClientRect()
    floatingLabel.style.position = 'fixed'
    floatingLabel.style.top = `${Math.max(4, rect.top - 28)}px`
    floatingLabel.style.left = `${rect.left}px`
    floatingLabel.style.zIndex = '999999'
    floatingLabel.style.background = '#42b883'
    floatingLabel.style.color = '#fff'
    floatingLabel.style.padding = '3px 10px'
    floatingLabel.style.borderRadius = '4px'
    floatingLabel.style.fontSize = '12px'
    floatingLabel.style.fontFamily = 'JetBrains Mono, monospace'
    floatingLabel.style.fontWeight = '500'
    floatingLabel.style.pointerEvents = 'none'
    floatingLabel.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)'
  }

  function hideLabel() {
    floatingLabel?.remove()
    floatingLabel = null
  }

  function buildHierarchy(instance: any): HierarchyItem[] {
    const items: HierarchyItem[] = []
    let current = instance

    while (current) {
      const name = current.type?.name || current.type?.__name || 'Anonymous'
      // Skip anonymous/fragment wrappers
      if (name !== 'Anonymous') {
        items.unshift({
          name,
          instance: current,
          el: getComponentElement(current),
        })
      }
      current = current.parent
    }

    return items
  }

  function getComponentElement(instance: any): HTMLElement | null {
    // Vue 3 internal: vnode.el is the root DOM element
    const el = instance.vnode?.el
    if (el instanceof HTMLElement) return el
    // subTree may have the element
    const subEl = instance.subTree?.el
    if (subEl instanceof HTMLElement) return subEl
    return null
  }

  function findVueComponent(el: HTMLElement): { name: string; instance: any } | null {
    let current: HTMLElement | null = el
    while (current) {
      const inst = (current as any).__vueParentComponent
      if (inst) {
        const name = inst.type?.name || inst.type?.__name || 'Anonymous'
        return { name, instance: inst }
      }
      current = current.parentElement
    }
    return null
  }

  function extractFromInstance(instance: any, name: string): GrabResult | null {
    const result: GrabResult = {
      componentName: name,
      filePath: instance.type?.__file || null,
      props: safeSerialize(instance.props),
      state: extractState(instance),
      computed: [],
      methods: [],
      storeName: null,
      storeState: null,
    }

    if (instance.setupState) {
      for (const key of Object.keys(instance.setupState)) {
        if (key.startsWith('_') || key.startsWith('$')) continue
        try {
          const val = instance.setupState[key]
          if (typeof val === 'function') {
            result.methods.push(key)
          } else if (val && typeof val === 'object' && val.effect && '__v_isRef' in val) {
            result.computed.push(key)
          }
        } catch { /* skip */ }
      }
    }

    if (instance.setupState) {
      for (const key of Object.keys(instance.setupState)) {
        try {
          const val = instance.setupState[key]
          if (val && val.$id && val.$state) {
            result.storeName = val.$id
            result.storeState = safeSerialize(val.$state)
            break
          }
        } catch { /* skip */ }
      }
    }

    return result
  }

  function extractFromElement(el: HTMLElement): GrabResult | null {
    const info = findVueComponent(el)
    if (!info) return null
    return extractFromInstance(info.instance, info.name)
  }

  function extractState(inst: any): Record<string, any> | null {
    if (!inst.setupState) return null
    const state: Record<string, any> = {}
    for (const key of Object.keys(inst.setupState)) {
      if (key.startsWith('_') || key.startsWith('$')) continue
      try {
        const val = inst.setupState[key]
        if (typeof val === 'function') continue
        if (val && typeof val === 'object' && '__v_isRef' in val) {
          state[key] = safeSerialize(val.value)
        } else {
          state[key] = safeSerialize(val)
        }
      } catch {
        state[key] = '[Unreadable]'
      }
    }
    return Object.keys(state).length > 0 ? state : null
  }

  function safeSerialize(obj: any, depth = 0, seen = new WeakSet()): any {
    if (depth > 4) return '[Deep]'
    if (obj === null || obj === undefined) return obj
    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') return obj
    if (typeof obj === 'function') return `[Function: ${obj.name || 'anonymous'}]`
    if (obj instanceof HTMLElement) return `[HTMLElement: ${obj.tagName.toLowerCase()}]`
    if (obj instanceof Date) return obj.toISOString()

    if (typeof obj === 'object') {
      if (seen.has(obj)) return '[Circular]'
      seen.add(obj)

      // Unwrap refs
      if ('__v_isRef' in obj && 'value' in obj) return safeSerialize(obj.value, depth, seen)

      if (Array.isArray(obj)) return obj.map(i => safeSerialize(i, depth + 1, seen))

      const result: Record<string, any> = {}
      for (const key of Object.keys(obj)) {
        if (key.startsWith('_') || key.startsWith('$')) continue
        try {
          result[key] = safeSerialize(obj[key], depth + 1, seen)
        } catch {
          result[key] = '[Error]'
        }
      }
      return result
    }
    return String(obj)
  }

  function removeItem(id: string) {
    grabbedItems.value = grabbedItems.value.filter(i => i.id !== id)
  }

  function clearAll() {
    grabbedItems.value = []
  }

  function copyAll(): string {
    const items = grabbedItems.value
    if (items.length === 0) return ''

    let output = `# Vue Component Context (${items.length} components)\n\n`
    items.forEach((item, i) => {
      output += `---\n\n## ${i + 1}. ${item.data.componentName}`
      if (item.data.filePath) output += ` (${item.data.filePath})`
      output += '\n\n'
      if (item.comment) output += `> **Note:** ${item.comment}\n\n`
      if (item.data.props) output += `### Props\n\`\`\`json\n${JSON.stringify(item.data.props, null, 2)}\n\`\`\`\n\n`
      if (item.data.state) output += `### State\n\`\`\`json\n${JSON.stringify(item.data.state, null, 2)}\n\`\`\`\n\n`
      if (item.data.computed.length) output += `### Computed\n${item.data.computed.join(', ')}\n\n`
      if (item.data.methods.length) output += `### Methods\n${item.data.methods.join(', ')}\n\n`
      if (item.data.storeName) {
        output += `### Pinia Store: ${item.data.storeName}\n\`\`\`json\n${JSON.stringify(item.data.storeState, null, 2)}\n\`\`\`\n\n`
      }
    })
    return output
  }

  onUnmounted(() => {
    if (isActive.value) deactivate()
  })

  return {
    isActive,
    hoveredComponent,
    grabbedItems,
    hierarchy,
    hierarchyIndex,
    toggle,
    activate,
    deactivate,
    removeItem,
    clearAll,
    copyAll,
  }
}
