<script setup lang="ts">
const props = defineProps<{
  data: number[]
  color?: string
  height?: number
}>()

const c = computed(() => props.color ?? '#42b883')
const h = computed(() => props.height ?? 40)
const max = computed(() => Math.max(...props.data))

const points = computed(() => {
  const step = 100 / (props.data.length - 1)
  return props.data
    .map((val, i) => `${i * step},${h.value - (val / max.value) * h.value}`)
    .join(' ')
})
</script>

<template>
  <svg :viewBox="`0 0 100 ${h}`" class="w-full" preserveAspectRatio="none" aria-hidden="true" role="img">
    <polyline
      :points="points"
      fill="none"
      :stroke="c"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      vector-effect="non-scaling-stroke"
    />
  </svg>
</template>
