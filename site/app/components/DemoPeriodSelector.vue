<script setup lang="ts">
defineProps<{
  selected: string
  options: string[]
}>()

defineEmits<{
  select: [value: string]
}>()
</script>

<template>
  <div class="flex gap-1">
    <button
      v-for="opt in options"
      :key="opt"
      class="rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors"
      :class="selected === opt
        ? 'bg-primary/15 text-primary'
        : 'text-subdued hover:text-dim'"
      @click="$emit('select', opt)"
    >
      {{ opt }}
    </button>
  </div>
</template>
