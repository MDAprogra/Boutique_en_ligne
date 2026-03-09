<template>
  <div class="container mx-auto px-4 py-10">
    <div class="mb-8 flex items-center gap-4">
      <Button variant="ghost" size="sm" as-child>
        <RouterLink :to="{ name: 'products' }">← Retour aux produits</RouterLink>
      </Button>
      <h1 class="text-3xl font-bold tracking-tight">Mes commandes</h1>
    </div>

    <!-- État : chargement -->
    <div v-if="loading" class="space-y-4">
      <div
        v-for="n in 3"
        :key="n"
        class="bg-muted h-28 animate-pulse rounded-xl"
      />
    </div>

    <!-- État : erreur -->
    <div v-else-if="error" class="text-destructive py-20 text-center">
      Une erreur est survenue lors du chargement de vos commandes.
    </div>

    <!-- Aucune commande -->
    <div v-else-if="orders.length === 0" class="flex flex-col items-center gap-4 py-24 text-center">
      <PackageSearch :size="64" class="text-muted-foreground/40" />
      <p class="text-muted-foreground text-lg">Vous n'avez pas encore passé de commande.</p>
      <Button as-child>
        <RouterLink :to="{ name: 'products' }">Découvrir nos produits</RouterLink>
      </Button>
    </div>

    <!-- Liste des commandes -->
    <div v-else class="space-y-6">
      <div
        v-for="order in orders"
        :key="order.id"
        class="rounded-xl border bg-card shadow-sm overflow-hidden"
      >
        
        <div class="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-6 py-4">
          <div class="flex items-center gap-4">
            <span class="text-sm font-semibold">Commande #{{ order.id }}</span>
            <span class="text-muted-foreground text-sm">
              {{ formatDate(order.createdAt) }}
            </span>
          </div>
          <div class="flex items-center gap-3">
            <span :class="['rounded-full px-3 py-0.5 text-xs font-semibold', statusClass(order.status)]">
              {{ statusLabel(order.status) }}
            </span>
            <span class="font-bold">{{ formatPrice(Number(order.total)) }}</span>
          </div>
        </div>

        <ul class="divide-y px-6">
          <li
            v-for="item in order.orderItems"
            :key="item.id"
            class="flex items-center justify-between py-3 text-sm"
          >
            <div class="flex items-center gap-3">
              <div>
                <p class="font-medium">{{ item.product.name }}</p>
                <p class="text-muted-foreground text-xs">{{ item.product.category.name }}</p>
              </div>
            </div>
            <div class="text-right">
              <p class="font-medium">
                {{ item.quantity }} × {{ formatPrice(Number(item.unitPrice)) }}
              </p>
              <p class="text-muted-foreground text-xs">
                = {{ formatPrice(item.quantity * Number(item.unitPrice)) }}
              </p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { ref, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { PackageSearch } from 'lucide-vue-next'
  import { Button } from '@/components/ui/button'
  import { useAuth } from '@/composables/useAuth'
  import type { Order } from '@/types'

  const router = useRouter()
  const { isAuthenticated, token } = useAuth()

  // Redirection si non connecté
  // On redirige vers la page d'auth si l'utilisateur n'est pas connecté.
  if (!isAuthenticated.value) {
    router.replace({ name: 'auth' })
  }


  /** Liste des commandes de l'utilisateur */
  const orders = ref<Order[]>([])
  const loading = ref(false)
  const error = ref(false)

  async function fetchOrders(): Promise<void> {
    loading.value = true
    error.value = false
    try {
      const res = await fetch('/api/orders/me', {
        headers: { Authorization: `Bearer ${token.value}` },
      })
      if (!res.ok) throw new Error()
      orders.value = await res.json()
    } catch {
      error.value = true
    } finally {
      loading.value = false
    }
  }

  /** Formate un montant en euros */
  function formatPrice(amount: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
  }

  /** Formate une date ISO*/
  function formatDate(iso: string): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  }

  function statusLabel(status: Order['status']): string {
    const labels: Record<Order['status'], string> = {
      PENDING: 'En attente',
      CONFIRMED: 'Confirmée',
      SHIPPED: 'Expédiée',
      DELIVERED: 'Livrée',
      CANCELLED: 'Annulée',
    }
    return labels[status]
  }

  function statusClass(status: Order['status']): string {
    const classes: Record<Order['status'], string> = {
      PENDING: 'bg-yellow-100 text-yellow-700',
      CONFIRMED: 'bg-blue-100 text-blue-700',
      SHIPPED: 'bg-purple-100 text-purple-700',
      DELIVERED: 'bg-green-100 text-green-700',
      CANCELLED: 'bg-destructive/10 text-destructive',
    }
    return classes[status]
  }

  onMounted(fetchOrders)
</script>
