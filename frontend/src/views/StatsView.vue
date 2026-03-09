<template>
  <div class="container mx-auto px-4 py-10">

    <div class="mb-8 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <Button variant="ghost" size="sm" as-child>
          <RouterLink :to="{ name: 'products' }">← Retour</RouterLink>
        </Button>
        <div>
          <h1 class="text-3xl font-bold tracking-tight">Statistiques</h1>
          <p class="text-muted-foreground text-sm mt-0.5">Tableau de bord administrateur</p>
        </div>
      </div>
      <span class="text-muted-foreground text-xs">{{ lastRefreshed }}</span>
    </div>

    <div v-if="loading" class="space-y-6">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div v-for="n in 3" :key="n" class="bg-muted h-28 animate-pulse rounded-xl" />
      </div>
      <div class="bg-muted h-64 animate-pulse rounded-xl" />
    </div>

    <div v-else-if="error" class="text-destructive py-20 text-center">
      Une erreur est survenue lors du chargement des statistiques.
    </div>

    <template v-else-if="stats">

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">

        <div class="rounded-xl border bg-card p-5 shadow-sm">
          <p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Commandes totales</p>
          <p class="mt-2 text-4xl font-bold">{{ stats.totalOrders }}</p>
        </div>

        <div class="rounded-xl border bg-card p-5 shadow-sm">
          <p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Chiffre d'affaires</p>
          <p class="mt-2 text-4xl font-bold">{{ formatPrice(stats.totalRevenue) }}</p>
        </div>

        <div class="rounded-xl border bg-card p-5 shadow-sm">
          <p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Clients inscrits</p>
          <p class="mt-2 text-4xl font-bold">{{ stats.totalUsers }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 md:grid-cols-2 mb-8">
        <div class="rounded-xl border bg-card p-5 shadow-sm">
          <h2 class="mb-4 text-sm font-semibold">Commandes par statut</h2>
          <ul class="space-y-3">
            <li v-for="(count, status) in stats.ordersByStatus" :key="status">
              <div class="mb-1 flex items-center justify-between text-xs">
                <span :class="['font-medium', statusTextClass(status as OrderStatus)]">
                  {{ statusLabel(status as OrderStatus) }}
                </span>
                <span class="text-muted-foreground">{{ count ?? 0 }} commande{{ (count ?? 0) > 1 ? 's' : '' }}</span>
              </div>
          
              <div class="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  :class="['h-2 rounded-full transition-all duration-500', statusBarClass(status as OrderStatus)]"
                  :style="{ width: barWidth(count ?? 0, stats.totalOrders) }"
                />
              </div>
            </li>
          </ul>
          <p v-if="Object.keys(stats.ordersByStatus).length === 0" class="text-muted-foreground text-sm">
            Aucune commande pour le moment.
          </p>
        </div>

        <div class="rounded-xl border bg-card p-5 shadow-sm">
          <h2 class="mb-4 text-sm font-semibold">Top 5 des produits vendus</h2>
          <ul v-if="stats.topProducts.length > 0" class="space-y-3">
            <li v-for="(product, index) in stats.topProducts" :key="product.productId">
              <div class="mb-1 flex items-center justify-between text-xs">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-muted-foreground">{{ index + 1 }}.</span>
                  <span class="font-medium truncate max-w-[160px]" :title="product.name">{{ product.name }}</span>
                  <span class="text-muted-foreground">({{ product.category }})</span>
                </div>
                <span class="text-muted-foreground shrink-0">{{ product.totalQuantity }} vendu{{ product.totalQuantity > 1 ? 's' : '' }}</span>
              </div>
              <div class="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  class="h-2 rounded-full bg-primary transition-all duration-500"
                  :style="{ width: barWidth(product.totalQuantity, stats.topProducts[0]?.totalQuantity ?? 1) }"
                />
              </div>
            </li>
          </ul>
          <p v-else class="text-muted-foreground text-sm">Aucun produit vendu pour le moment.</p>
        </div>
      </div>

      <div class="rounded-xl border bg-card p-5 shadow-sm">
        <h2 class="mb-4 text-sm font-semibold">Revenus quotidiens — 30 derniers jours</h2>

        <div v-if="stats.revenuePerDay.length > 0">
        
          <div class="flex items-end gap-1 h-40">
            <div
              v-for="day in stats.revenuePerDay"
              :key="day.day"
              class="group relative flex flex-col items-center flex-1"
            >
              <div
                class="w-full rounded-t bg-primary/80 hover:bg-primary transition-colors"
                :style="{ height: barHeightPx(day.revenue, maxDailyRevenue, 140) }"
              />
              <div class="pointer-events-none absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center z-10">
                <div class="rounded bg-foreground px-2 py-1 text-xs text-background whitespace-nowrap shadow-lg">
                  <p class="font-semibold">{{ formatPrice(day.revenue) }}</p>
                  <p class="text-[10px] opacity-70">{{ formatDateShort(day.day) }}</p>
                </div>
              </div>
            </div>
          </div>
          <div class="flex justify-between mt-1 text-[10px] text-muted-foreground">
            <span>{{ formatDateShort(stats.revenuePerDay[0].day) }}</span>
            <span>{{ formatDateShort(stats.revenuePerDay[stats.revenuePerDay.length - 1].day) }}</span>
          </div>
        </div>
        <p v-else class="text-muted-foreground text-sm">Aucun revenu sur les 30 derniers jours.</p>
      </div>

    </template>
  </div>
</template>

<script lang="ts" setup>
  import { ref, computed, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { Button } from '@/components/ui/button'
  import { useAuth } from '@/composables/useAuth'

  const router = useRouter()
  const { isAdmin, token } = useAuth()

  // Redirection si l'utilisateur n'est pas admin
  if (!isAdmin.value) {
    router.replace({ name: 'home' })
  }

  type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'

  interface Stats {
    totalOrders: number
    totalRevenue: number
    totalUsers: number
    ordersByStatus: Partial<Record<OrderStatus, number>>
    topProducts: {
      productId: number
      name: string
      category: string
      totalQuantity: number
    }[]
    revenuePerDay: { day: string; revenue: number }[]
  }

  const stats = ref<Stats | null>(null)
  const loading = ref(false)
  const error = ref(false)
  
  const lastRefreshed = ref('')
  const maxDailyRevenue = computed(
    () => Math.max(...(stats.value?.revenuePerDay.map((d) => d.revenue) ?? [1])),
  )

  async function fetchStats(): Promise<void> {
    loading.value = true
    error.value = false
    try {
      const res = await fetch('/api/stats', {
        headers: { Authorization: `Bearer ${token.value}` },
      })
      if (!res.ok) throw new Error()
      stats.value = await res.json()
      lastRefreshed.value = new Intl.DateTimeFormat('fr-FR', {
        hour: '2-digit', minute: '2-digit',
      }).format(new Date())
    } catch {
      error.value = true
    } finally {
      loading.value = false
    }
  }

  function barWidth(value: number, max: number): string {
    if (!max) return '2%'
    return `${Math.max(2, Math.round((value / max) * 100))}%`
  }

  function barHeightPx(value: number, max: number, maxPx: number): string {
    if (!max) return '2px'
    return `${Math.max(2, Math.round((value / max) * maxPx))}px`
  }

  /** Formate un montant en euros */
  function formatPrice(amount: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
  }

  /** Formate une date ISO courte*/
  function formatDateShort(iso: string): string {
    return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' }).format(new Date(iso))
  }

  /** Traduction français d'un statut de commande */
  function statusLabel(status: OrderStatus): string {
    const map: Record<OrderStatus, string> = {
      PENDING: 'En attente',
      CONFIRMED: 'Confirmée',
      SHIPPED: 'Expédiée',
      DELIVERED: 'Livrée',
      CANCELLED: 'Annulée',
    }
    return map[status]
  }
  function statusBarClass(status: OrderStatus): string {
    const map: Record<OrderStatus, string> = {
      PENDING: 'bg-yellow-400',
      CONFIRMED: 'bg-blue-400',
      SHIPPED: 'bg-purple-400',
      DELIVERED: 'bg-green-400',
      CANCELLED: 'bg-destructive',
    }
    return map[status] ?? 'bg-muted-foreground'
  }

  function statusTextClass(status: OrderStatus): string {
    const map: Record<OrderStatus, string> = {
      PENDING: 'text-yellow-600',
      CONFIRMED: 'text-blue-600',
      SHIPPED: 'text-purple-600',
      DELIVERED: 'text-green-600',
      CANCELLED: 'text-destructive',
    }
    return map[status] ?? ''
  }

  onMounted(fetchStats)
</script>
