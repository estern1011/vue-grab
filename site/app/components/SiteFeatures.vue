<script setup lang="ts">
const features = [
  { icon: '{ }', title: 'Props, State & Computed', desc: 'Extracts reactive data with proper ref unwrapping. Composition API and Options API.' },
  { icon: '[ ]', title: 'Pinia, Vuex & Vue Query', desc: 'Detects which stores and queries a component uses. Shows state, getters, and actions.' },
  { icon: '+ +', title: 'Multi-Select & Comments', desc: 'Grab multiple components. Add notes for your agent. Copy everything at once.' },
  { icon: '< />', title: 'Vue Router State', desc: 'Current route, params, query, meta, and matched routes included automatically.' },
  { icon: '(x)', title: 'DOM Locators', desc: 'CSS selectors, XPath, bounding box, and page URL. Browser agents can find the exact element.' },
  { icon: '# #', title: 'Context Preview Panel', desc: 'See exactly what your agent will see. Expandable tree view with color-coded values.' },
  { icon: '/ /', title: 'Component Hierarchy', desc: 'Navigate parent and child components with Alt+Up/Down. Breadcrumb shows the full tree.' },
  { icon: '>_', title: 'Keyboard First', desc: 'Alt+Shift+V to activate. Enter to grab. Esc to dismiss. No mouse required.' },
]
</script>

<template>
  <section class="py-20">
    <div class="mx-auto max-w-4xl px-6">
      <h2 class="mb-12 text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">Everything your agent needs</h2>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SiteFeatureCard
          v-for="f in features"
          :key="f.title"
          :icon="f.icon"
          :title="f.title"
          :description="f.desc"
        />
      </div>
    </div>
  </section>
</template>
