<script setup lang="ts">
defineProps<{
  grabActive: boolean
}>()

defineEmits<{
  toggle: []
}>()
</script>

<template>
  <header class="pt-16 pb-8">
    <div class="mx-auto max-w-4xl px-6">
      <div class="mb-10 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-white">Vue Grab</h1>
          <p class="mt-1 text-sm text-[#888]">
            Chrome extension to select Vue component context for your AI coding agent.
          </p>
        </div>
        <a
          href="https://github.com/estern1011/vue-grab"
          class="rounded-lg border border-white/[0.06] px-4 py-2 text-sm font-medium text-[#e0e0e0] transition hover:border-white/10 hover:bg-white/[0.02]"
        >
          GitHub
        </a>
      </div>

      <div id="try-it" class="rounded-xl border border-white/[0.06] bg-[#0d0d1a] p-6">
        <div class="mb-4 flex items-center justify-between">
          <p class="text-sm text-[#888]">
            <template v-if="!grabActive">
              Click components in the demo below to grab their props, state, and stores.
            </template>
            <template v-else>
              Hover to see component names. <strong class="text-white">Click to grab.</strong>
              <kbd class="ml-1 rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[11px]">Esc</kbd> to stop.
            </template>
          </p>
          <button
            class="vue-grab-embedded-btn shrink-0 rounded-lg px-5 py-2 text-sm font-semibold transition"
            :class="grabActive
              ? 'border border-red-500/30 bg-red-500/15 text-red-400 hover:bg-red-500/25'
              : 'bg-[#42b883] text-white hover:bg-[#35a372]'"
            @click="$emit('toggle')"
          >
            {{ grabActive ? 'Stop' : 'Start Grabbing' }}
          </button>
        </div>

        <DemoApp />
      </div>
    </div>
  </header>
</template>
