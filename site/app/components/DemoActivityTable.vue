<script setup lang="ts">
import { Card, CardHeader, CardContent } from '~/components/ui/card'
import type { Order } from '~/stores/dashboard'

const props = defineProps<{
  orders: Order[]
  sortOrder: 'asc' | 'desc'
}>()

defineEmits<{
  toggleSort: []
}>()

const sortedOrders = computed(() => {
  const items = [...props.orders]
  return props.sortOrder === 'desc' ? items : items.reverse()
})
</script>

<template>
  <Card>
    <CardHeader class="flex-row items-center justify-between pb-3">
      <span class="text-sm font-semibold text-white">Recent Orders</span>
      <button
        class="rounded border border-white/10 px-2 py-1 text-[10px] text-[#9b9bb2] transition-colors hover:border-[#42b883] hover:text-[#42b883]"
        @click="$emit('toggleSort')"
      >
        {{ sortOrder === 'desc' ? 'Newest first' : 'Oldest first' }}
      </button>
    </CardHeader>
    <CardContent class="p-0">
      <DemoOrderRow v-for="order in sortedOrders" :key="order.id" :order="order" />
    </CardContent>
  </Card>
</template>
