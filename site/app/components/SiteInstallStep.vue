<script setup lang="ts">
defineProps<{
  step: number
  title: string
}>()
</script>

<template>
  <div class="flex gap-5">
    <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.06] bg-elevated text-sm font-bold text-primary">
      {{ step }}
    </div>
    <div>
      <h3 class="mb-2 text-base font-semibold text-white">{{ title }}</h3>
      <slot />
    </div>
  </div>
</template>
