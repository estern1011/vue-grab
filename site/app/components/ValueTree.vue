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
    <span v-if="name" class="shrink-0" :class="typeof Number(name) === 'number' && !isNaN(Number(name)) ? 'text-[#9498b8]' : 'text-[#c4a7e7]'">{{ name }}</span>

    <!-- Primitives -->
    <template v-if="!isExpandable || d >= maxDepth">
      <span v-if="value === null" class="italic text-[#9498b8]">null</span>
      <span v-else-if="value === undefined" class="italic text-[#9498b8]">undefined</span>
      <span v-else-if="typeof value === 'boolean'" class="text-[#e78284]">{{ value }}</span>
      <span v-else-if="typeof value === 'number'" class="text-[#ef9f76]">{{ value }}</span>
      <span v-else-if="typeof value === 'string' && value.startsWith('[')" class="text-[#9498b8]">{{ value }}</span>
      <span v-else-if="typeof value === 'string'" class="text-[#a6d189]">"{{ value.length > 60 ? value.slice(0, 57) + '…' : value }}"</span>
      <span v-else-if="d >= maxDepth && isArray" class="text-[#81a1c1]">Array({{ value.length }})</span>
      <span v-else-if="d >= maxDepth" class="text-[#81a1c1]">{{ summary }}</span>
      <span v-else class="text-[#9b9bb2]">{{ String(value) }}</span>
    </template>

    <!-- Expandable -->
    <details v-else class="inline w-full" :class="{ 'w-full': true }">
      <summary class="inline cursor-pointer text-[#81a1c1] hover:text-[#88c0d0]">
        <span class="mr-1 inline-block text-[7px] text-[#8b8ba7] transition-transform">&#9654;</span>{{ summary }}
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
