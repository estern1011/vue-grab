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
      class="rounded-md px-2.5 py-1 text-[11px] font-medium transition"
      :class="selected === opt
        ? 'bg-[#42b883]/15 text-[#42b883]'
        : 'text-[#8b8ba7] hover:text-[#9b9bb2]'"
      @click="$emit('select', opt)"
    >
      {{ opt }}
    </button>
  </div>
</template>
