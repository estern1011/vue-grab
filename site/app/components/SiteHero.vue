<script setup lang="ts">
defineProps<{
  grabActive: boolean
}>()
</script>

<template>
  <header class="pb-16 pt-28 text-center">
    <div class="mx-auto max-w-3xl px-6">
      <span class="mb-7 inline-block rounded-full border border-[#42b883]/20 bg-[#42b883]/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-[#42b883]">
        Chrome Extension
      </span>
      <h1 class="mb-6 text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
        <span class="text-[#42b883]">Click</span> a Vue component.<br>
        <span class="text-[#42b883]">Grab</span> its context.<br>
        <span class="text-[#42b883]">Ship</span> with your agent.
      </h1>
      <p class="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-[#888]">
        Select context for AI coding agents directly from your running Vue app.
        Props, state, stores, routes, locators &mdash; everything your agent needs, in one click.
      </p>
      <div class="flex flex-wrap justify-center gap-3">
        <a
          href="https://github.com/estern1011/vue-grab"
          class="inline-flex items-center gap-2 rounded-lg bg-[#42b883] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#35a372] hover:shadow-lg hover:shadow-[#42b883]/20"
        >
          GitHub
        </a>
        <a
          href="#try-it"
          class="inline-flex items-center gap-2 rounded-lg border border-white/[0.06] px-6 py-3 text-sm font-semibold text-[#e0e0e0] transition hover:border-white/10 hover:bg-white/[0.02]"
        >
          Try it live
        </a>
      </div>
    </div>
  </header>
</template>
