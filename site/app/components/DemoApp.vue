<script setup lang="ts">
import { useDashboardStore } from '~/stores/dashboard'

const store = useDashboardStore()

provide('dashboardPeriod', computed(() => store.period))

const revenueChart = [32, 38, 35, 42, 40, 45, 43, 48]
const usersChart = [20, 22, 21, 25, 24, 26, 27, 28]
const ordersChart = [15, 14, 16, 13, 12, 11, 10, 10]
</script>

<template>
  <div class="overflow-hidden rounded-xl border border-white/[0.06] shadow-2xl">
    <!-- Browser chrome -->
    <div class="flex items-center gap-3 bg-[#1a1a2e] px-4 py-2.5">
      <div class="flex gap-1.5">
        <span class="h-2.5 w-2.5 rounded-full bg-[#e74c3c]"></span>
        <span class="h-2.5 w-2.5 rounded-full bg-[#f39c12]"></span>
        <span class="h-2.5 w-2.5 rounded-full bg-[#2ecc71]"></span>
      </div>
      <div class="flex-1 rounded-md bg-white/[0.06] px-3 py-1 font-mono text-xs text-[#888]">
        localhost:3000/dashboard
      </div>
    </div>

    <!-- App -->
    <div class="flex min-h-[420px] bg-[#0f0f23]">
      <DemoSidebar :active-tab="store.selectedTab" @navigate="store.setTab($event as any)" />
      <main class="flex-1 p-5">
        <DemoHeader
          :title="store.selectedTab"
          :period="store.period"
          @update:period="store.setPeriod($event as any)"
        />

        <template v-if="store.selectedTab === 'overview' || store.selectedTab === 'orders'">
          <div class="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <DemoStatCard
              label="Revenue"
              :value="store.formattedRevenue"
              :change="store.revenueChange"
              trend="up"
              :period="store.period"
              :chart-data="revenueChart"
            />
            <DemoStatCard
              label="Active Users"
              :value="store.activeUsers.toLocaleString()"
              :change="store.userChange"
              trend="up"
              :period="store.period"
              :chart-data="usersChart"
            />
            <DemoStatCard
              label="Orders"
              :value="store.totalOrders.toLocaleString()"
              :change="store.orderChange"
              trend="down"
              :period="store.period"
              :chart-data="ordersChart"
            />
          </div>
        </template>

        <DemoActivityTable
          v-if="store.selectedTab === 'overview' || store.selectedTab === 'orders'"
          :orders="store.recentOrders"
          :sort-order="store.sortOrder"
          @toggle-sort="store.toggleSort()"
        />

        <DemoUserList
          v-if="store.selectedTab === 'users'"
          :users="store.recentUsers"
        />
      </main>
    </div>
  </div>
</template>
