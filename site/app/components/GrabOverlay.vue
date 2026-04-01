<script setup lang="ts">
defineProps<{
  isActive: boolean
  hoveredComponent: string | null
}>()

defineEmits<{
  deactivate: []
}>()
</script>

<template>
  <!-- Active indicator (bottom-left badge) -->
  <Transition name="indicator">
    <div
      v-if="isActive"
      class="vue-grab-embedded-btn fixed bottom-5 left-5 z-[999997] rounded-lg bg-[#42b883] px-4 py-3 font-sans text-[13px] font-medium text-white shadow-lg"
    >
      <div class="mb-2 flex items-center gap-2 text-sm font-semibold">
        Vue Grab Active
      </div>
      <div class="flex flex-wrap gap-2 text-[11px] font-normal opacity-90">
        <span class="flex items-center gap-1">
          <kbd class="rounded bg-white/20 px-1.5 py-0.5 font-mono text-[10px]">Click</kbd> Add to list
        </span>
        <span class="flex items-center gap-1">
          <kbd class="rounded bg-white/20 px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd> Done
        </span>
      </div>
    </div>
  </Transition>

  <!-- Breadcrumb (shows hovered component at top-center) -->
  <Transition name="breadcrumb">
    <div
      v-if="isActive && hoveredComponent"
      class="vue-grab-embedded-btn fixed left-1/2 top-5 z-[999997] -translate-x-1/2 rounded-lg bg-[#2c3e50] px-4 py-2.5 font-sans shadow-lg"
    >
      <div class="flex items-center gap-2 text-xs text-white">
        <span class="rounded bg-white/10 px-2 py-0.5 text-[#9b9bb2]">App</span>
        <span class="text-[#8b8ba7]">&rsaquo;</span>
        <span class="rounded bg-[#42b883] px-2 py-0.5 font-semibold">{{ hoveredComponent }}</span>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.indicator-enter-active, .indicator-leave-active { transition: all 0.2s ease; }
.indicator-enter-from, .indicator-leave-to { opacity: 0; transform: translateY(20px); }

.breadcrumb-enter-active, .breadcrumb-leave-active { transition: all 0.15s ease; }
.breadcrumb-enter-from, .breadcrumb-leave-to { opacity: 0; transform: translate(-50%, -10px); }
</style>
