<template>
  <div
    class="bg-card text-card-foreground flex flex-col overflow-hidden rounded-xl border shadow-sm transition-shadow hover:shadow-md"
  >
    
    <div class="flex flex-1 flex-col gap-2 p-4">
      
      <span
        class="bg-secondary text-secondary-foreground w-fit rounded-full px-2.5 py-0.5 text-xs font-medium"
      >
        {{ product.category.name }}
      </span>
      <h3 class="line-clamp-2 text-sm font-semibold leading-tight">{{ product.name }}</h3>
      <p class="text-muted-foreground line-clamp-2 flex-1 text-xs">
        {{ product.description }}
      </p>
    </div>

  
    <div class="flex items-center justify-between border-t px-4 py-3">
      <span class="text-base font-bold">{{ formatPrice(product.price) }}</span>
      <span
        :class="[
          'rounded-full px-2.5 py-0.5 text-xs font-medium',
          product.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-destructive/10 text-destructive',
        ]"
      >
        {{ product.stock > 0 ? `En stock (${product.stock})` : 'Rupture' }}
      </span>
    </div>

    <div v-if="!isAdmin" class="border-t px-4 py-2">
      <Button
        class="w-full"
        size="sm"
        :disabled="!canAddToCart"
        @click="handleAddToCart"
        :aria-label="`Ajouter ${product.name} au panier`"
      >
        <ShoppingCart :size="14" class="mr-1.5" />
        {{ cartQty >= product.stock ? 'Max. atteint' : 'Ajouter au panier' }}
      </Button>
    </div>

    <div v-if="isAdmin" class="flex gap-2 border-t px-4 py-2">
      <Button variant="outline" size="sm" class="flex-1" @click="emit('edit', product)">
        <Pencil :size="18" />
      </Button>
      <Button variant="destructive" size="sm" class="flex-1" @click="emit('delete', product)">
        <Trash :size="18" />
      </Button>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { computed } from 'vue'
  import type { Product } from '@/types'
  import { Button } from '@/components/ui/button'
  import { Pencil, Trash, ShoppingCart } from 'lucide-vue-next'
  import { useCart } from '@/composables/useCart'

  const props = defineProps<{ product: Product; isAdmin?: boolean }>()

  const emit = defineEmits<{
    edit: [product: Product]
    delete: [product: Product]
  }>()

  const { cartItems, addToCart } = useCart()

  const cartQty = computed(() => {
    const item = cartItems.value.find((i) => i.product.id === props.product.id)
    return item ? item.quantity : 0
  })

  /**
   * On peut ajouter au panier uniquement si le stock est > 0
   * ET qu'on n'a pas encore atteint la limite de stock dans le panier.
   */
  const canAddToCart = computed(
    () => props.product.stock > 0 && cartQty.value < props.product.stock,
  )


  /** Formate un prix en euros */
  function formatPrice(price: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price)
  }

  /** Ajoute une unité du produit au panier via le composable useCart */
  function handleAddToCart(): void {
    addToCart(props.product, 1)
  }
</script>

