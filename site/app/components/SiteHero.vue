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
          <p class="mt-1 text-sm text-dim">
            Chrome extension to grab Vue component context for your AI coding agent.
            Inspired by
            <a href="https://github.com/nicholasgriffintn/react-grab" class="text-primary hover:underline">react-grab</a>.
          </p>
        </div>
        <a
          href="https://github.com/estern1011/vue-grab"
          class="rounded-lg border border-white/[0.06] px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-white/10 hover:bg-white/[0.02]"
        >
          GitHub
        </a>
      </div>

      <div id="try-it" class="scroll-mt-20 rounded-xl border border-white/[0.06] bg-background p-6">
        <h2 class="mb-3 text-lg font-semibold text-white text-pretty">Interactive demo</h2>
        <div class="mb-4 flex items-center justify-between">
          <p class="text-sm text-dim">
            <template v-if="!grabActive">
              Click components in the demo below to grab their props, state, and stores.
            </template>
            <template v-else>
              <strong class="text-white">Click</strong> or <Kbd>Enter</Kbd> to grab.
              <Kbd class="ml-1">Tab</Kbd> next component.
              <Kbd class="ml-1">Alt+↑↓</Kbd> tree.
              <Kbd class="ml-1">Esc</Kbd> stop.
            </template>
          </p>
          <button
            class="vue-grab-embedded-btn shrink-0 rounded-lg px-5 py-2 text-sm font-semibold transition-colors"
            :class="grabActive
              ? 'border border-red-500/30 bg-red-500/15 text-red-400 hover:bg-red-500/25'
              : 'bg-primary text-white hover:bg-primary/80'"
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
