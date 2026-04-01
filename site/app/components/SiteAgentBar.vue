<script setup lang="ts">
const agents = ['Claude Code', 'Cursor', 'Windsurf', 'Any clipboard workflow']
</script>

<template>
  <section class="pb-20 text-center">
    <p class="mb-3 text-xs uppercase tracking-widest text-subdued">Works with</p>
    <div class="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm font-medium text-dim">
      <template v-for="(agent, i) in agents" :key="agent">
        <span v-if="i > 0" class="text-subdued">&middot;</span>
        <span>{{ agent }}</span>
      </template>
    </div>
  </section>
</template>
