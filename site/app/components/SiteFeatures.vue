<script setup lang="ts">
const features = [
  'Props, state, computed, and refs — Composition & Options API',
  'Pinia, Vuex, and Vue Query store state',
  'Vue Router params, query, and meta',
  'CSS selectors, XPath, and bounding box locators',
  'Multi-select with per-component comments',
  'Component hierarchy navigation (Alt+Up/Down)',
  'Keyboard-first: Alt+Shift+V to activate, Enter to grab',
  'Copy all context to clipboard or send to Cursor',
]
</script>

<template>
  <section class="py-16">
    <div class="mx-auto max-w-4xl px-6">
      <h2 class="mb-6 text-lg font-semibold text-white">What it grabs</h2>
      <ul class="grid gap-x-8 gap-y-2 text-sm text-[#9b9bb2] sm:grid-cols-2">
        <li v-for="f in features" :key="f" class="flex items-start gap-2">
          <span class="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#42b883]" />
          {{ f }}
        </li>
      </ul>
    </div>
  </section>
</template>
