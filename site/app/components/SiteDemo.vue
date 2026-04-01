<script setup lang="ts">
defineProps<{
  grabActive: boolean
}>()

defineEmits<{
  toggle: []
}>()
</script>

<template>
  <section id="try-it" class="py-20">
    <div class="mx-auto max-w-4xl px-6">
      <h2 class="mb-12 text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">Try it right here</h2>

      <div class="flex flex-col items-center gap-6">
        <button
          class="vue-grab-embedded-btn rounded-lg px-6 py-3 text-sm font-semibold transition"
          :class="grabActive
            ? 'border border-red-500/30 bg-red-500/15 text-red-400 hover:bg-red-500/25'
            : 'bg-[#42b883] text-white shadow-lg shadow-[#42b883]/20 hover:bg-[#35a372]'"
          @click="$emit('toggle')"
        >
          {{ grabActive ? 'Stop Grabbing' : 'Start Grabbing' }}
        </button>

        <p class="mx-auto max-w-lg text-center text-sm text-[#9b9bb2]">
          <template v-if="!grabActive">
            Click the button above, then click any element in the demo app below.
            These are <strong class="text-[#42b883]">real Vue components</strong>
            with props, stores, and computed values &mdash; no extension needed.
          </template>
          <template v-else>
            Hover over the demo app to see component names.
            <strong class="text-white">Click to grab.</strong>
            Press <kbd class="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[11px]">Esc</kbd> when done.
          </template>
        </p>

        <DemoApp />

        <div class="mt-8 grid w-full gap-6 sm:grid-cols-3">
          <SiteDemoStep :step="1" title="Hover" description="See the Vue component name for any element" />
          <SiteDemoStep :step="2" title="Click & comment" description="Add components to your list with notes" />
          <SiteDemoStep :step="3" title="Copy all" description="Paste the full context into your agent" />
        </div>
      </div>
    </div>
  </section>
</template>
