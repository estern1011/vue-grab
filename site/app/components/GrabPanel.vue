<script setup lang="ts">
import { Badge } from '~/components/ui/badge'

const props = defineProps<{
  items: Array<{ id: string; data: any; comment: string }>
  isActive: boolean
}>()

const emit = defineEmits<{
  remove: [id: string]
  clear: []
  copy: []
  close: []
  send: [editor: string]
  'update:comment': [id: string, comment: string]
}>()

const editors = [
  { key: 'cursor', name: 'Cursor', canSendDirect: true },
  { key: 'windsurf', name: 'Windsurf', canSendDirect: false },
  { key: 'claude-code', name: 'Claude Code', canSendDirect: false },
] as const

const selectedEditor = ref('cursor')

const currentEditor = computed(() => editors.find(e => e.key === selectedEditor.value)!)

function handleSend() {
  emit('send', selectedEditor.value)

  if (currentEditor.value.canSendDirect) {
    const condensed = buildCondensedContext()
    try {
      window.open(`cursor://anysphere.cursor-deeplink/prompt?text=${encodeURIComponent(condensed)}`, '_blank')
    } catch { /* fallback is clipboard */ }
  } else if (selectedEditor.value === 'windsurf') {
    const filePaths = new Set(
      props.items.map(i => i.data.filePath).filter(Boolean) as string[]
    )
    for (const fp of filePaths) {
      try { window.open(`windsurf://file/${fp}`, '_blank') } catch { /* skip */ }
    }
  }
}

function buildCondensedContext(): string {
  const parts: string[] = []
  parts.push(`Here is Vue component context from ${props.items.length} grabbed component(s):\n`)

  for (const item of props.items) {
    const d = item.data
    parts.push(`Component: ${d.componentName}`)
    if (d.filePath) parts.push(`File: ${d.filePath}`)
    if (item.comment) parts.push(`Note: ${item.comment}`)
    if (d.props && Object.keys(d.props).length) parts.push(`Props: ${JSON.stringify(d.props)}`)
    if (d.state && Object.keys(d.state).length) parts.push(`State: ${JSON.stringify(d.state)}`)
    if (d.computed?.length) parts.push(`Computed: ${d.computed.join(', ')}`)
    if (d.methods?.length) parts.push(`Methods: ${d.methods.join(', ')}`)
    if (d.storeName) parts.push(`Store ${d.storeName}: ${JSON.stringify(d.storeState)}`)
    parts.push('')
  }

  let result = parts.join('\n')
  if (result.length > 7000) result = result.slice(0, 6997) + '...'
  return result
}

const sendLabel = computed(() => {
  const name = currentEditor.value.name
  return currentEditor.value.canSendDirect ? `Send to ${name}` : `Copy for ${name}`
})
</script>

<template>
  <Transition name="panel">
    <div v-if="isActive" class="vue-grab-embedded-panel fixed right-0 top-0 z-[999998] flex h-screen w-[380px] flex-col border-l border-white/[0.06] bg-[#1a1a2e] font-sans text-[13px] text-[#e0e0e0] shadow-2xl">
      <!-- Header -->
      <div class="border-b border-white/[0.06] bg-[#16213e] px-4 py-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <span class="text-[15px] font-bold text-[#42b883]">Vue Grab</span>
            <Badge variant="secondary">{{ items.length }} component{{ items.length !== 1 ? 's' : '' }}</Badge>
          </div>
          <button class="text-lg text-[#888] transition hover:text-white" @click="emit('close')">&times;</button>
        </div>
        <div class="mt-2.5 flex items-center gap-2">
          <span class="text-[10px] uppercase tracking-wider text-[#555]">Send to</span>
          <div class="flex gap-1">
            <button
              v-for="editor in editors"
              :key="editor.key"
              class="rounded px-2 py-0.5 text-[11px] font-medium transition"
              :class="selectedEditor === editor.key
                ? 'bg-[#42b883]/15 text-[#42b883]'
                : 'text-[#666] hover:text-[#888]'"
              @click="selectedEditor = editor.key"
            >
              {{ editor.name }}
            </button>
          </div>
        </div>
      </div>

      <!-- Items -->
      <div class="flex-1 overflow-y-auto p-2">
        <div v-if="items.length === 0" class="py-12 text-center text-sm text-[#555]">
          Click any element in the demo to grab its component context.
        </div>

        <div
          v-for="(item, idx) in items"
          :key="item.id"
          class="mb-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
        >
          <div class="mb-1 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="flex h-5 w-5 items-center justify-center rounded-full bg-[#42b883] text-[10px] font-bold text-white">{{ idx + 1 }}</span>
              <span class="text-sm font-semibold text-white">{{ item.data.componentName }}</span>
            </div>
            <button class="text-[#666] transition hover:text-red-400" @click="emit('remove', item.id)">&times;</button>
          </div>

          <div v-if="item.data.filePath" class="mb-2 truncate font-mono text-[10px] text-[#888]">
            {{ item.data.filePath }}
          </div>

          <input
            type="text"
            class="mb-2 w-full rounded border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-xs text-[#e0e0e0] outline-none placeholder:text-[#555] focus:border-[#42b883]"
            placeholder="Add a note for the agent..."
            :value="item.comment"
            @input="emit('update:comment', item.id, ($event.target as HTMLInputElement).value)"
          />

          <!-- Props -->
          <details v-if="item.data.props && Object.keys(item.data.props).length" open class="mb-1">
            <summary class="flex cursor-pointer items-center gap-1 py-1 text-[11px] font-semibold text-[#bbb]">
              Props
              <span class="rounded-full bg-white/[0.06] px-1.5 text-[10px] font-normal text-[#666]">{{ Object.keys(item.data.props).length }}</span>
            </summary>
            <div class="pl-2">
              <ValueTree v-for="(val, key) in item.data.props" :key="key" :name="String(key)" :value="val" :depth="0" />
            </div>
          </details>

          <!-- State -->
          <details v-if="item.data.state && Object.keys(item.data.state).length" class="mb-1">
            <summary class="flex cursor-pointer items-center gap-1 py-1 text-[11px] font-semibold text-[#bbb]">
              State
              <span class="rounded-full bg-white/[0.06] px-1.5 text-[10px] font-normal text-[#666]">{{ Object.keys(item.data.state).length }}</span>
            </summary>
            <div class="pl-2">
              <ValueTree v-for="(val, key) in item.data.state" :key="key" :name="String(key)" :value="val" :depth="0" />
            </div>
          </details>

          <!-- Store -->
          <details v-if="item.data.storeName" class="mb-1">
            <summary class="flex cursor-pointer items-center gap-1 py-1 text-[11px] font-semibold text-[#bbb]">
              Store: {{ item.data.storeName }}
              <Badge variant="default" class="text-[9px]">pinia</Badge>
            </summary>
            <div v-if="item.data.storeState" class="pl-2">
              <ValueTree v-for="(val, key) in item.data.storeState" :key="key" :name="String(key)" :value="val" :depth="0" />
            </div>
          </details>

          <!-- Computed/Methods -->
          <div v-if="item.data.computed?.length" class="flex flex-wrap gap-1 py-1">
            <span class="text-[11px] font-semibold text-[#bbb]">Computed:</span>
            <span v-for="c in item.data.computed" :key="c" class="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-[#c6d0f5]">{{ c }}</span>
          </div>
          <div v-if="item.data.methods?.length" class="flex flex-wrap gap-1 py-1">
            <span class="text-[11px] font-semibold text-[#bbb]">Methods:</span>
            <span v-for="m in item.data.methods" :key="m" class="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-[#c6d0f5]">{{ m }}</span>
          </div>
        </div>
      </div>

      <!-- Actions (matches extension layout) -->
      <div v-if="items.length > 0" class="flex gap-2 border-t border-white/[0.06] bg-[#16213e] p-3">
        <button
          class="flex-1 rounded-md bg-[#42b883] py-2 text-[13px] font-semibold text-white transition hover:bg-[#35a372]"
          @click="handleSend"
        >
          {{ sendLabel }}
        </button>
        <button
          class="rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs text-[#aaa] transition hover:border-white/[0.15] hover:text-white"
          @click="emit('copy')"
        >
          Copy
        </button>
        <button
          class="rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs text-[#aaa] transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
          @click="emit('clear')"
        >
          Clear
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.panel-enter-active, .panel-leave-active { transition: transform 0.2s ease; }
.panel-enter-from, .panel-leave-to { transform: translateX(380px); }
</style>
