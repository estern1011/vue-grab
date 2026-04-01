<script setup lang="ts">
defineProps<{
  data: Record<string, any>
}>()
</script>

<template>
  <div class="flex flex-col gap-[3px] rounded-md bg-black/20 px-2.5 py-1.5">
    <div v-for="(val, key) in data" :key="key" class="flex items-baseline justify-between font-mono text-[11px]">
      <span class="text-code-key">{{ key }}</span>
      <ValueTree :value="val" :depth="0" class="text-right" />
    </div>
  </div>
</template>
