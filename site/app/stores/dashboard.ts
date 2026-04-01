import { defineStore } from 'pinia'

export interface DashboardUser {
  id: number
  name: string
  email: string
  plan: 'free' | 'pro' | 'enterprise'
  signedUp: string
  lastActive: string
}

export interface Order {
  id: string
  customer: string
  amount: number
  status: 'pending' | 'completed' | 'refunded'
  date: string
}

export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    revenue: 48290,
    revenueChange: 12.5,
    activeUsers: 2847,
    userChange: 8.2,
    totalOrders: 1024,
    orderChange: -3.1,
    currency: 'USD',
    period: 'monthly' as 'daily' | 'weekly' | 'monthly',
    recentUsers: [
      { id: 1, name: 'Alice Chen', email: 'alice@example.com', plan: 'pro', signedUp: '2024-01-15', lastActive: '2m ago' },
      { id: 2, name: 'Bob Martinez', email: 'bob@example.com', plan: 'enterprise', signedUp: '2023-11-02', lastActive: '5m ago' },
      { id: 3, name: 'Carol Wu', email: 'carol@example.com', plan: 'free', signedUp: '2024-03-20', lastActive: '12m ago' },
      { id: 4, name: 'Dave Patel', email: 'dave@example.com', plan: 'pro', signedUp: '2024-02-08', lastActive: '1h ago' },
      { id: 5, name: 'Eve Johnson', email: 'eve@example.com', plan: 'free', signedUp: '2024-03-28', lastActive: '3h ago' },
    ] as DashboardUser[],
    recentOrders: [
      { id: 'ORD-1847', customer: 'Alice Chen', amount: 299.00, status: 'completed', date: '2m ago' },
      { id: 'ORD-1846', customer: 'Frank Lee', amount: 149.00, status: 'pending', date: '15m ago' },
      { id: 'ORD-1845', customer: 'Grace Kim', amount: 499.00, status: 'completed', date: '1h ago' },
      { id: 'ORD-1844', customer: 'Hank Brown', amount: 99.00, status: 'refunded', date: '2h ago' },
      { id: 'ORD-1843', customer: 'Ivy Davis', amount: 299.00, status: 'completed', date: '3h ago' },
    ] as Order[],
    sortOrder: 'desc' as 'asc' | 'desc',
    selectedTab: 'overview' as 'overview' | 'users' | 'orders',
  }),

  getters: {
    formattedRevenue: (state) => `$${state.revenue.toLocaleString()}`,
    proUsers: (state) => state.recentUsers.filter(u => u.plan === 'pro' || u.plan === 'enterprise'),
    completedOrders: (state) => state.recentOrders.filter(o => o.status === 'completed'),
    pendingOrderTotal: (state) =>
      state.recentOrders
        .filter(o => o.status === 'pending')
        .reduce((sum, o) => sum + o.amount, 0),
  },

  actions: {
    toggleSort() {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc'
    },
    setPeriod(period: 'daily' | 'weekly' | 'monthly') {
      this.period = period
    },
    setTab(tab: 'overview' | 'users' | 'orders') {
      this.selectedTab = tab
    },
  },
})
