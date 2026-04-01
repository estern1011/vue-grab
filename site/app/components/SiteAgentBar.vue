<script setup lang="ts">
const agents = ['Claude Code', 'Cursor', 'Windsurf', 'Any clipboard workflow']
</script>

<template>
  <section class="pb-20 text-center">
    <p class="mb-3 text-xs uppercase tracking-widest text-[#8b8ba7]">Works with</p>
    <div class="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm font-medium text-[#9b9bb2]">
      <template v-for="(agent, i) in agents" :key="agent">
        <span v-if="i > 0" class="text-[#8b8ba7]">&middot;</span>
        <span>{{ agent }}</span>
      </template>
    </div>
  </section>
</template>
