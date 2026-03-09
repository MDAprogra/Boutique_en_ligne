import { ref, computed } from 'vue'
import type { Product, CartItem, Order } from '@/types'

const cartItems = ref<CartItem[]>([])

const cartCount = computed(() =>
    cartItems.value.reduce((sum, item) => sum + item.quantity, 0),
)

const cartTotal = computed(() =>
    cartItems.value.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
)

function addToCart(product: Product, qty = 1): boolean {
    const existing = cartItems.value.find((i) => i.product.id === product.id)

    if (existing) {
        // Article déjà présent : on vérifie qu'on ne dépasse pas le stock disponible
        const newQty = existing.quantity + qty
        if (newQty > product.stock) return false // stock insuffisant
        existing.quantity = newQty
    } else {
        // Nouvel article : on snapshote le produit pour conserver son prix actuel
        if (qty > product.stock) return false
        cartItems.value.push({ product, quantity: qty })
    }
    return true
}

function updateQty(productId: number, qty: number): void {
    if (qty <= 0) {
        removeFromCart(productId)
        return
    }
    const item = cartItems.value.find((i) => i.product.id === productId)
    if (item) {
        // On s'assure de ne pas dépasser le stock du produit
        item.quantity = Math.min(qty, item.product.stock)
    }
}

/** Retire complètement un article du panier */
function removeFromCart(productId: number): void {
    cartItems.value = cartItems.value.filter((i) => i.product.id !== productId)
}

/** Vide entièrement le panier */
function clearCart(): void {
    cartItems.value = []
}


async function checkout(token: string): Promise<Order> {
    const items = cartItems.value.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
    }))

    const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ items }),
    })

    if (!res.ok) {
        const { message } = await res.json()
        throw new Error(message)
    }

    const order: Order = await res.json()
    // On vide le panier uniquement en cas de succès
    clearCart()
    return order
}


export function useCart() {
    return {
        cartItems,
        cartCount,
        cartTotal,
        addToCart,
        updateQty,
        removeFromCart,
        clearCart,
        checkout,
    }
}
