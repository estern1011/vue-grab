<script setup lang="ts">
defineProps<{
  label: string
  count?: number | string
}>()
</script>

<template>
  <div class="mb-1 flex items-center gap-1.5 pb-1">
    <span class="text-[10px] font-semibold uppercase tracking-[0.06em] text-subdued">{{ label }}</span>
    <slot name="after-label" />
    <div class="h-px flex-1 bg-border-subtle" />
    <span v-if="count != null" class="font-mono text-[10px] text-subdued">{{ count }}</span>
    <slot name="trailing" />
  </div>
</template>
