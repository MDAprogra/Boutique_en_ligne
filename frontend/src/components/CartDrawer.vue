<template>
  <!-- Bouton d'ouverture du panier avec badge du nombre d'articles -->
  <div>
    <button
      class="relative flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-accent"
      aria-label="Ouvrir le panier"
      @click="open = true"
    >
      <ShoppingCart :size="20" />
      <!-- Badge : affiché uniquement si le panier n'est pas vide -->
      <span
        v-if="cartCount > 0"
        class="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground"
      >
        {{ cartCount > 99 ? '99+' : cartCount }}
      </span>
    </button>

    <Dialog v-model:open="open">
      <DialogContent class="flex h-full max-h-[90vh] w-full max-w-md flex-col gap-0 p-0">
        <DialogHeader class="border-b px-6 py-4">
          <DialogTitle class="flex items-center gap-2">
            <ShoppingCart :size="20" />
            Mon panier
            <span v-if="cartCount > 0" class="text-muted-foreground text-sm font-normal">
              ({{ cartCount }} article{{ cartCount > 1 ? 's' : '' }})
            </span>
          </DialogTitle>
        </DialogHeader>

        <!-- Corps du panier -->
        <div class="flex-1 overflow-y-auto px-6 py-4">
          <!-- Panier vide -->
          <div v-if="cartItems.length === 0" class="flex flex-col items-center gap-3 py-16 text-center">
            <ShoppingCart :size="48" class="text-muted-foreground/40" />
            <p class="text-muted-foreground">Votre panier est vide.</p>
          </div>

          <!-- Liste des articles -->
          <ul v-else class="space-y-4">
            <li
              v-for="item in cartItems"
              :key="item.product.id"
              class="flex items-center gap-4 rounded-lg border p-3"
            >
              <!-- Infos produit -->
              <div class="flex-1 min-w-0">
                <p class="truncate text-sm font-medium">{{ item.product.name }}</p>
                <p class="text-muted-foreground text-xs">
                  {{ formatPrice(item.product.price) }} / unité
                </p>
                <p
                  v-if="item.quantity > item.product.stock"
                  class="text-destructive mt-0.5 text-xs"
                >
                  Stock limité à {{ item.product.stock }}
                </p>
              </div>

              <!-- Contrôle de la quantité -->
              <div class="flex items-center gap-1">
                <!-- Bouton diminuer la quantité -->
                <Button
                  variant="outline"
                  size="icon"
                  class="h-7 w-7"
                  :disabled="item.quantity <= 1"
                  @click="updateQty(item.product.id, item.quantity - 1)"
                  aria-label="Diminuer la quantité"
                >
                  <Minus :size="12" />
                </Button>

                <!-- Affichage de la quantité courante -->
                <span class="w-8 text-center text-sm font-medium">{{ item.quantity }}</span>

                <!-- Bouton augmenter la quantité (bloqué au stock disponible) -->
                <Button
                  variant="outline"
                  size="icon"
                  class="h-7 w-7"
                  :disabled="item.quantity >= item.product.stock"
                  @click="updateQty(item.product.id, item.quantity + 1)"
                  :aria-label="`Augmenter la quantité (stock : ${item.product.stock})`"
                >
                  <Plus :size="12" />
                </Button>
              </div>

              <!-- Prix de la ligne -->
              <span class="w-20 text-right text-sm font-semibold">
                {{ formatPrice(item.product.price * item.quantity) }}
              </span>

              <!-- Supprimer l'article -->
              <Button
                variant="ghost"
                size="icon"
                class="h-7 w-7 text-destructive hover:text-destructive"
                @click="removeFromCart(item.product.id)"
                aria-label="Supprimer l'article"
              >
                <Trash :size="14" />
              </Button>
            </li>
          </ul>
        </div>

        <div v-if="cartItems.length > 0" class="border-t px-6 py-4 space-y-3">
          <div class="flex items-center justify-between text-base font-bold">
            <span>Total</span>
            <span>{{ formatPrice(cartTotal) }}</span>
          </div>
          <p v-if="checkoutError" class="text-destructive text-sm">{{ checkoutError }}</p>
          <p v-if="checkoutSuccess" class="text-green-600 text-sm font-medium">
            ✓ Commande passée avec succès !
          </p>

          <div class="flex gap-2">
            <Button variant="outline" class="flex-1" @click="clearCart">
              Vider
            </Button>

            <!-- Bouton commander : redirige vers auth si non connecté -->
            <Button
              v-if="!isAuthenticated"
              class="flex-1"
              @click="open = false; router.push({ name: 'auth' })"
            >
              Se connecter pour commander
            </Button>
            <Button
              v-else
              class="flex-1"
              :disabled="checkoutLoading"
              @click="handleCheckout"
            >
              {{ checkoutLoading ? 'Commande en cours...' : 'Commander' }}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script lang="ts" setup>
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { ShoppingCart, Minus, Plus, Trash } from 'lucide-vue-next'
  import { Button } from '@/components/ui/button'
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
  } from '@/components/ui/dialog'
  import { useCart } from '@/composables/useCart'
  import { useAuth } from '@/composables/useAuth'

  const router = useRouter()

  const { cartItems, cartCount, cartTotal, updateQty, removeFromCart, clearCart, checkout } =
    useCart()

  const { isAuthenticated, token } = useAuth()

  const open = ref(false)
  const checkoutLoading = ref(false)
  const checkoutError = ref('')
  const checkoutSuccess = ref(false)

  /**
   * Formate un montant en euros
   */
  function formatPrice(price: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price)
  }

  async function handleCheckout(): Promise<void> {
    checkoutError.value = ''
    checkoutSuccess.value = false
    checkoutLoading.value = true

    try {
      await checkout(token.value!)
      checkoutSuccess.value = true

      setTimeout(() => {
        open.value = false
        checkoutSuccess.value = false
      }, 1500)
    } catch (e) {
      checkoutError.value = e instanceof Error ? e.message : 'Une erreur est survenue.'
    } finally {
      checkoutLoading.value = false
    }
  }
</script>
