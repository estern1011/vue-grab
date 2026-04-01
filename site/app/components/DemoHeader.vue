<script setup lang="ts">
defineProps<{
  title: string
  period: string
}>()

defineEmits<{
  'update:period': [value: string]
}>()

const periods = ['daily', 'weekly', 'monthly']
</script>

<template>
  <div class="mb-4 flex items-center justify-between">
    <h3 class="text-lg font-semibold capitalize text-white">{{ title }}</h3>
    <DemoPeriodSelector
      :selected="period"
      :options="periods"
      @select="$emit('update:period', $event)"
    />
  </div>
</template>
