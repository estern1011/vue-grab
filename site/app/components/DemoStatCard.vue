<script setup lang="ts">
import { Card, CardHeader, CardContent } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'

const props = defineProps<{
  label: string
  value: string
  change: number
  trend: 'up' | 'down'
  period: string
  chartData: number[]
}>()

const trendColor = computed(() => props.trend === 'up' ? 'text-[#42b883]' : 'text-red-400')
const chartColor = computed(() => props.trend === 'up' ? '#42b883' : '#e74c3c')
</script>

<template>
  <Card>
    <CardHeader class="pb-1">
      <div class="flex items-center justify-between">
        <span class="text-[10px] uppercase tracking-wider text-[#888]">{{ label }}</span>
        <Badge variant="secondary" class="text-[9px]">{{ period }}</Badge>
      </div>
    </CardHeader>
    <CardContent>
      <div class="text-2xl font-bold text-white">{{ value }}</div>
      <div class="mt-0.5 text-xs font-medium" :class="trendColor">
        {{ trend === 'up' ? '+' : '' }}{{ change }}%
      </div>
      <div class="mt-2 h-8 opacity-60">
        <DemoMiniChart :data="chartData" :color="chartColor" :height="32" />
      </div>
    </CardContent>
  </Card>
</template>
