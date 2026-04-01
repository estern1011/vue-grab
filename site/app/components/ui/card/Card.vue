<script setup lang="ts">
import { cn } from '~/lib/utils'

const props = defineProps<{ class?: string }>()
</script>

<template>
  <div :class="cn('rounded-xl border border-white/[0.06] bg-[#111128] text-[#e0e0e0] shadow', props.class)">
    <slot />
  </div>
</template>
