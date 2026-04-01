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

export function useVueGrab() {
  const isActive = ref(false)
  const hoveredComponent = ref<string | null>(null)
  const grabbedItems = ref<Array<{ id: string; data: GrabResult; comment: string }>>([])
  let floatingLabel: HTMLElement | null = null
  let currentHighlight: HTMLElement | null = null

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
    currentHighlight = target
    target.style.outline = '2px solid #42b883'
    target.style.outlineOffset = '2px'
    target.style.cursor = 'crosshair'

    hoveredComponent.value = info.name
    showLabel(target, info.name)
  }

  function onMouseOut(e: MouseEvent) {
    const target = e.target as HTMLElement
    if (target.closest('.vue-grab-embedded-panel')) return
    clearHighlight()
    hoveredComponent.value = null
  }

  function onClick(e: MouseEvent) {
    const target = e.target as HTMLElement
    if (target.closest('.vue-grab-embedded-panel') || target.closest('.vue-grab-embedded-btn')) return

    e.preventDefault()
    e.stopPropagation()

    const result = extractFromElement(target)
    if (result) {
      grabbedItems.value.push({
        id: Math.random().toString(36).slice(2),
        data: result,
        comment: '',
      })
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      deactivate()
    }
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

  function extractFromElement(el: HTMLElement): GrabResult | null {
    const info = findVueComponent(el)
    if (!info) return null

    const inst = info.instance
    const result: GrabResult = {
      componentName: info.name,
      filePath: inst.type?.__file || null,
      props: safeSerialize(inst.props),
      state: extractState(inst),
      computed: [],
      methods: [],
      storeName: null,
      storeState: null,
    }

    // Extract computed and methods from setupState
    if (inst.setupState) {
      for (const key of Object.keys(inst.setupState)) {
        if (key.startsWith('_') || key.startsWith('$')) continue
        try {
          const val = inst.setupState[key]
          if (typeof val === 'function') {
            result.methods.push(key)
          } else if (val && typeof val === 'object' && val.effect && '__v_isRef' in val) {
            result.computed.push(key)
          }
        } catch { /* skip */ }
      }
    }

    // Check for Pinia store
    if (inst.setupState) {
      for (const key of Object.keys(inst.setupState)) {
        try {
          const val = inst.setupState[key]
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
    output += `---\n*Generated by Vue Grab*\n`
    return output
  }

  onUnmounted(() => {
    if (isActive.value) deactivate()
  })

  return {
    isActive,
    hoveredComponent,
    grabbedItems,
    toggle,
    activate,
    deactivate,
    removeItem,
    clearAll,
    copyAll,
  }
}
