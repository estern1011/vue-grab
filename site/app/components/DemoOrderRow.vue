<script setup lang="ts">
import { Badge } from '~/components/ui/badge'
import type { Order } from '~/stores/dashboard'

defineProps<{
  order: Order
}>()

function statusVariant(status: string) {
  if (status === 'completed') return 'default' as const
  if (status === 'pending') return 'secondary' as const
  return 'destructive' as const
}
</script>

<template>
  <div class="flex items-center gap-3 border-t border-white/[0.04] px-4 py-2.5 text-xs">
    <span class="w-20 font-mono text-[#9b9bb2]">{{ order.id }}</span>
    <DemoAvatar :name="order.customer" size="sm" />
    <span class="flex-1 font-medium text-white">{{ order.customer }}</span>
    <span class="w-16 text-right font-mono text-[#ef9f76]">${{ order.amount.toFixed(0) }}</span>
    <Badge :variant="statusVariant(order.status)" class="w-20 justify-center text-[10px]">
      {{ order.status }}
    </Badge>
    <span class="w-12 text-right text-[#8b8ba7]">{{ order.date }}</span>
  </div>
</template>
