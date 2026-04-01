<script setup lang="ts">
defineProps<{
  activeTab: string
}>()

defineEmits<{
  navigate: [tab: string]
}>()

const navItems = [
  { key: 'overview', label: 'Overview', icon: '~' },
  { key: 'users', label: 'Users', icon: '@' },
  { key: 'orders', label: 'Orders', icon: '#' },
]
</script>

<template>
  <aside class="hidden w-44 shrink-0 border-r border-white/[0.06] bg-[#111128] px-3 py-5 md:block">
    <div class="mb-6 text-base font-bold text-white">DemoApp</div>
    <nav class="flex flex-col gap-0.5">
      <button
        v-for="item in navItems"
        :key="item.key"
        class="rounded-md px-3 py-2 text-left text-[13px] transition"
        :class="activeTab === item.key
          ? 'bg-[#42b883]/10 font-medium text-[#42b883]'
          : 'text-[#9b9bb2] hover:bg-white/[0.03]'"
        @click="$emit('navigate', item.key)"
      >
        {{ item.label }}
      </button>
    </nav>
  </aside>
</template>
