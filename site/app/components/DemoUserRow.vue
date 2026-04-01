<script setup lang="ts">
import { Badge } from '~/components/ui/badge'
import type { DashboardUser } from '~/stores/dashboard'

defineProps<{
  user: DashboardUser
}>()

function planVariant(plan: string) {
  if (plan === 'enterprise') return 'default' as const
  if (plan === 'pro') return 'secondary' as const
  return 'outline' as const
}
</script>

<template>
  <div class="flex items-center gap-3 border-t border-white/[0.04] px-4 py-2.5 text-xs">
    <DemoAvatar :name="user.name" />
    <div class="flex-1">
      <div class="font-medium text-white">{{ user.name }}</div>
      <div class="text-subdued">{{ user.email }}</div>
    </div>
    <Badge :variant="planVariant(user.plan)" class="text-[10px]">{{ user.plan }}</Badge>
    <span class="w-12 text-right text-subdued">{{ user.lastActive }}</span>
  </div>
</template>
