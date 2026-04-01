<script setup lang="ts">
const props = defineProps<{
  name?: string
  value: any
  depth?: number
}>()

const d = computed(() => props.depth ?? 0)
const maxDepth = 4

const isExpandable = computed(() => {
  const v = props.value
  if (v === null || v === undefined || typeof v !== 'object') return false
  if (Array.isArray(v)) return v.length > 0
  return Object.keys(v).length > 0
})

const isArray = computed(() => Array.isArray(props.value))
const keys = computed(() => {
  if (!props.value || typeof props.value !== 'object') return []
  return Object.keys(props.value)
})

const summary = computed(() => {
  const v = props.value
  if (Array.isArray(v)) return `Array(${v.length})`
  if (typeof v === 'object' && v !== null) {
    const k = Object.keys(v)
    return `{${k.slice(0, 3).join(', ')}${k.length > 3 ? ', …' : ''}}`
  }
  return ''
})
</script>

<template>
  <div class="flex flex-wrap items-baseline gap-x-2 font-mono text-[11px]" :class="name ? 'py-0.5' : ''">
    <span v-if="name" class="shrink-0" :class="Number.isFinite(Number(name)) ? 'text-code-null' : 'text-code-key'">{{ name }}</span>

    <!-- Primitives -->
    <template v-if="!isExpandable || d >= maxDepth">
      <span v-if="value === null" class="italic text-code-null">null</span>
      <span v-else-if="value === undefined" class="italic text-code-null">undefined</span>
      <span v-else-if="typeof value === 'boolean'" class="text-code-bool">{{ value }}</span>
      <span v-else-if="typeof value === 'number'" class="text-code-number">{{ value }}</span>
      <span v-else-if="typeof value === 'string' && value.startsWith('[')" class="text-code-null">{{ value }}</span>
      <span v-else-if="typeof value === 'string'" class="text-code-string">"{{ value.length > 60 ? value.slice(0, 57) + '…' : value }}"</span>
      <span v-else-if="d >= maxDepth && isArray" class="text-code-link">Array({{ value.length }})</span>
      <span v-else-if="d >= maxDepth" class="text-code-link">{{ summary }}</span>
      <span v-else class="text-dim">{{ String(value) }}</span>
    </template>

    <!-- Expandable -->
    <details v-else class="inline w-full">
      <summary class="inline cursor-pointer text-code-link hover:text-code-link">
        <span class="mr-1 inline-block text-[7px] text-subdued transition-transform">&#9654;</span>{{ summary }}
      </summary>
      <div class="ml-1 border-l border-white/[0.06] pl-3">
        <ValueTree
          v-for="k in keys"
          :key="k"
          :name="k"
          :value="value[k]"
          :depth="d + 1"
        />
      </div>
    </details>
  </div>
</template>

<style scoped>
details[open] > summary > span:first-child {
  transform: rotate(90deg);
}
</style>
