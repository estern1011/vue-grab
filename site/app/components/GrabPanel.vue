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
  if (result.length > 7000) result = result.slice(0, 6997) + '…'
  return result
}

const sendLabel = computed(() => {
  const name = currentEditor.value.name
  return currentEditor.value.canSendDirect ? `Send to ${name}` : `Copy for ${name}`
})

function shortPath(filePath: string) {
  const idx = filePath.indexOf('components/')
  if (idx !== -1) return '~/' + filePath.slice(idx)
  const srcIdx = filePath.indexOf('src/')
  if (srcIdx !== -1) return '~/' + filePath.slice(srcIdx)
  return filePath
}

function padIndex(idx: number) {
  return String(idx + 1).padStart(2, '0')
}
</script>

<template>
  <Transition name="panel">
    <div v-if="isActive" class="vue-grab-embedded-panel fixed right-0 top-0 z-[999998] flex h-screen w-[380px] flex-col border-l border-border-subtle bg-panel font-sans text-[13px] text-foreground shadow-2xl">
      <!-- Header -->
      <div class="border-b border-border bg-panel-header px-4 py-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <span class="text-[15px] font-bold text-primary">Vue Grab</span>
            <Badge variant="secondary">{{ items.length }} component{{ items.length !== 1 ? 's' : '' }}</Badge>
          </div>
          <button aria-label="Close panel" class="text-lg text-dim transition-colors hover:text-white" @click="emit('close')">&times;</button>
        </div>
        <div class="mt-2.5 flex items-center gap-2">
          <span class="text-[10px] uppercase tracking-wider text-subdued">Send to</span>
          <div class="flex gap-1">
            <button
              v-for="editor in editors"
              :key="editor.key"
              class="rounded px-2 py-0.5 text-[11px] font-medium transition-colors"
              :class="selectedEditor === editor.key
                ? 'bg-primary/15 text-primary'
                : 'text-subdued hover:text-dim'"
              @click="selectedEditor = editor.key"
            >
              {{ editor.name }}
            </button>
          </div>
        </div>
      </div>

      <!-- Items -->
      <div class="flex-1 overflow-y-auto p-2.5">
        <div v-if="items.length === 0" class="py-12 text-center text-sm text-subdued">
          Click any element in the demo to grab its component context.
        </div>

        <div
          v-for="(item, idx) in items"
          :key="item.id"
          class="mb-1.5 overflow-hidden rounded-[10px] border border-border bg-white/[0.025]"
        >
          <!-- Card header -->
          <div class="flex items-center justify-between border-b border-border-subtle px-3.5 py-2.5">
            <div class="flex items-center gap-2.5">
              <span class="font-mono text-[10px] font-bold text-primary">{{ padIndex(idx) }}</span>
              <span class="text-[13px] font-semibold tracking-tight text-white">{{ item.data.componentName }}</span>
            </div>
            <button aria-label="Remove component" class="text-sm text-subdued transition-colors hover:text-red-400" @click="emit('remove', item.id)">&times;</button>
          </div>

          <!-- Card body -->
          <div class="flex flex-col gap-2 px-3.5 py-2.5">
            <div v-if="item.data.filePath" class="min-w-0 truncate font-mono text-[10px] text-subdued">
              {{ shortPath(item.data.filePath) }}
            </div>

            <input
              type="text"
              :aria-label="`Note for ${item.data.componentName}`"
              :name="`note-${item.id}`"
              autocomplete="off"
              class="w-full rounded-md border bg-white/[0.03] px-2.5 py-[7px] text-xs text-foreground transition-colors placeholder:text-subdued"
              :class="item.comment
                ? 'border-primary/[0.12] bg-primary/[0.04] focus:border-primary'
                : 'border-border focus:border-primary'"
              placeholder="Add a note…"
              :value="item.comment"
              @input="emit('update:comment', item.id, ($event.target as HTMLInputElement).value)"
            />

            <!-- Props -->
            <div v-if="item.data.props && Object.keys(item.data.props).length">
              <GrabSectionHeader label="Props" :count="Object.keys(item.data.props).length" />
              <KeyValueGrid :data="item.data.props" />
            </div>

            <!-- State -->
            <div v-if="item.data.state && Object.keys(item.data.state).length">
              <GrabSectionHeader label="State" :count="Object.keys(item.data.state).length" />
              <KeyValueGrid :data="item.data.state" />
            </div>

            <!-- Store -->
            <div v-if="item.data.storeName">
              <GrabSectionHeader label="Store">
                <template #after-label>
                  <span class="rounded bg-primary/10 px-1.5 py-px text-[9px] font-medium text-primary">{{ item.data.storeName }}</span>
                </template>
                <template #trailing>
                  <span class="font-mono text-[9px] text-primary/50">pinia</span>
                </template>
              </GrabSectionHeader>
              <KeyValueGrid v-if="item.data.storeState" :data="item.data.storeState" />
            </div>

            <!-- Computed -->
            <div v-if="item.data.computed?.length">
              <GrabSectionHeader label="Computed" />
              <div class="flex flex-wrap gap-1.5">
                <span v-for="c in item.data.computed" :key="c" class="rounded-[5px] bg-[#c6d0f5]/[0.06] px-2 py-[3px] font-mono text-[10px] text-code-tag">{{ c }}</span>
              </div>
            </div>

            <!-- Methods -->
            <div v-if="item.data.methods?.length">
              <GrabSectionHeader label="Methods" />
              <div class="flex flex-wrap gap-1.5">
                <span v-for="m in item.data.methods" :key="m" class="rounded-[5px] bg-[#c6d0f5]/[0.06] px-2 py-[3px] font-mono text-[10px] text-code-tag">{{ m }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div v-if="items.length > 0" class="flex flex-col gap-2 border-t border-border bg-panel-header px-4 py-3">
        <button
          class="w-full rounded-lg bg-gradient-to-br from-primary to-[#38a576] py-2.5 text-[13px] font-semibold tracking-tight text-white transition-[filter] hover:brightness-110"
          @click="handleSend"
        >
          {{ sendLabel }}
        </button>
        <div class="flex gap-1.5">
          <button
            class="flex-1 rounded-md bg-white/[0.04] py-[7px] text-xs font-medium text-subdued transition-colors hover:text-white"
            @click="emit('copy')"
          >
            Copy to clipboard
          </button>
          <button
            class="rounded-md bg-white/[0.04] px-4 py-[7px] text-xs font-medium text-subdued transition-colors hover:bg-red-500/10 hover:text-red-400"
            @click="emit('clear')"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
@media (prefers-reduced-motion: no-preference) {
  .panel-enter-active, .panel-leave-active { transition: transform 0.2s ease; }
}
.panel-enter-from, .panel-leave-to { transform: translateX(380px); }
</style>
