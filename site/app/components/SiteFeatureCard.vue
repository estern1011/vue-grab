<script setup lang="ts">
defineProps<{
  icon: string
  title: string
  description: string
}>()
</script>

<template>
  <div class="rounded-xl border border-white/[0.06] bg-[#111128] p-6 transition-colors hover:border-[#42b883]/20">
    <div class="mb-3 font-mono text-lg text-[#42b883]">{{ icon }}</div>
    <h3 class="mb-2 text-[15px] font-semibold text-white">{{ title }}</h3>
    <p class="text-[13px] leading-relaxed text-[#9b9bb2]">{{ description }}</p>
  </div>
</template>
