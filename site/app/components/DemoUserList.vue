<script setup lang="ts">
import { Card, CardHeader, CardContent } from '~/components/ui/card'
import type { DashboardUser } from '~/stores/dashboard'

defineProps<{
  users: DashboardUser[]
}>()
</script>

<template>
  <Card>
    <CardHeader class="pb-3">
      <span class="text-sm font-semibold text-white">Users</span>
    </CardHeader>
    <CardContent class="p-0">
      <DemoUserRow v-for="user in users" :key="user.id" :user="user" />
    </CardContent>
  </Card>
</template>
