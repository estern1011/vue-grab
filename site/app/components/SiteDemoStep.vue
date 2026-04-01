<script setup lang="ts">
defineProps<{
  step: number
  title: string
  description: string
}>()
</script>

<template>
  <div class="text-center">
    <div class="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#42b883] text-sm font-bold text-white">
      {{ step }}
    </div>
    <h3 class="mb-1 text-sm font-semibold text-white">{{ title }}</h3>
    <p class="text-xs text-[#9b9bb2]">{{ description }}</p>
  </div>
</template>
