<script setup lang="ts">
const props = defineProps<{
  name: string
  size?: 'sm' | 'md'
}>()

const initials = computed(() => props.name.split(' ').map(n => n[0]).join(''))
const colors = ['#42b883', '#e74c3c', '#3498db', '#f39c12', '#9b59b6', '#1abc9c']
const color = computed(() => {
  let hash = 0
  for (const ch of props.name) hash = ch.charCodeAt(0) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
})
</script>

<template>
  <div
    role="img"
    :aria-label="name"
    class="flex items-center justify-center rounded-full font-bold text-white"
    :class="size === 'sm' ? 'h-6 w-6 text-[9px]' : 'h-8 w-8 text-[10px]'"
    :style="{ background: `${color}25`, color }"
  >
    {{ initials }}
  </div>
</template>
