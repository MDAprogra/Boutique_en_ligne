<template>
  <div class="container mx-auto px-4 py-10">
    <div class="mb-8 flex flex-col gap-4">
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <Button variant="ghost" size="sm" as-child>
            <RouterLink :to="{ name: 'home' }">← Retour</RouterLink>
          </Button>
          <h1 class="text-3xl font-bold tracking-tight">Nos produits</h1>
        </div>

        <div class="flex items-center gap-3">
          <Select v-model="sort" @update:model-value="onSortChange">
            <SelectTrigger class="w-52">
              <SelectValue placeholder="Trier par..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="price_asc">Prix croissant</SelectItem>
              <SelectItem value="price_desc">Prix décroissant</SelectItem>
            </SelectContent>
          </Select>

          <Button v-if="isAdmin" @click="openCreate">Ajouter un produit</Button>
        </div>
      </div>

      <!-- Barre de recherche -->
      <div class="relative max-w-md">
        <svg
          class="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <Input
          id="search-products"
          v-model="search"
          class="pl-9"
          placeholder="Rechercher un produit..."
          @input="onSearchInput"
        />
      </div>
    </div>

    <!-- Grille produits -->
    <div v-if="loading" class="grid grid-cols-4 gap-6">
      <div
        v-for="n in PAGE_SIZE"
        :key="n"
        class="bg-muted aspect-[3/4] animate-pulse rounded-xl"
      />
    </div>

    <div v-else-if="error" class="text-destructive py-20 text-center">
      Une erreur est survenue lors du chargement des produits.
    </div>

    <div v-else>
      <div class="grid grid-cols-4 gap-6">
        <ProductCard
          v-for="product in products"
          :key="product.id"
          :product="product"
          :is-admin="isAdmin"
          @edit="openEdit"
          @delete="openDeleteConfirm"
        />
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="mt-10 flex justify-center">
        <Pagination
          :total="totalItems"
          :items-per-page="PAGE_SIZE"
          :sibling-count="1"
          show-edges
          :default-page="currentPage"
          @update:page="onPageChange"
        >
          <PaginationContent v-slot="{ items }">
            <PaginationFirst />
            <PaginationPrevious />
            <template v-for="(item, index) in items" :key="index">
              <PaginationItem
                v-if="item.type === 'page'"
                :value="item.value"
                :is-active="item.value === currentPage"
              >
                {{ item.value }}
              </PaginationItem>
              <PaginationEllipsis v-else :index="index" />
            </template>
            <PaginationNext />
            <PaginationLast />
          </PaginationContent>
        </Pagination>
      </div>

      <p class="text-muted-foreground mt-4 text-center text-sm">
        {{ totalItems }} produit{{ totalItems > 1 ? 's' : '' }} au total
      </p>
    </div>
  </div>

  <!-- Modal ajout / modification -->
  <Dialog v-model:open="formDialogOpen">
    <DialogContent class="max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ isEditing ? 'Modifier le produit' : 'Ajouter un produit' }}</DialogTitle>
      </DialogHeader>

      <form @submit.prevent="submitForm" class="mt-2 space-y-4">
        <div class="space-y-1.5">
          <Label for="form-name">Nom</Label>
          <Input id="form-name" v-model="form.name" required />
        </div>
        <div class="space-y-1.5">
          <Label for="form-description">Description</Label>
          <Textarea id="form-description" v-model="form.description" :rows="3" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <Label for="form-price">Prix (€)</Label>
            <Input id="form-price" v-model="form.price" type="number" min="0" step="0.01" required />
          </div>
          <div class="space-y-1.5">
            <Label for="form-stock">Stock</Label>
            <Input id="form-stock" v-model="form.stock" type="number" min="0" required />
          </div>
        </div>
        <div class="space-y-1.5">
          <Label>Catégorie</Label>
          <Select v-model="form.categoryName">
            <SelectTrigger>
              <SelectValue placeholder="Choisir une catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="cat in CATEGORIES" :key="cat" :value="cat">{{ cat }}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <p v-if="formError" class="text-destructive text-sm">{{ formError }}</p>

        <DialogFooter>
          <Button type="button" variant="outline" @click="formDialogOpen = false">Annuler</Button>
          <Button type="submit" :disabled="formLoading">
            {{ formLoading ? 'Enregistrement...' : isEditing ? 'Modifier' : 'Ajouter' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>

  <!-- Dialog confirmation suppression -->
  <Dialog v-model:open="deleteDialogOpen">
    <DialogContent class="max-w-sm">
      <DialogHeader>
        <DialogTitle>Supprimer le produit</DialogTitle>
        <DialogDescription>
          Voulez-vous vraiment supprimer <strong>{{ productToDelete?.name }}</strong> ? Cette action est irréversible.
        </DialogDescription>
      </DialogHeader>
      <p v-if="deleteError" class="text-destructive text-sm">{{ deleteError }}</p>
      <DialogFooter>
        <Button variant="outline" @click="deleteDialogOpen = false">Annuler</Button>
        <Button variant="destructive" :disabled="deleteLoading" @click="confirmDelete">
          {{ deleteLoading ? 'Suppression...' : 'Supprimer' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script lang="ts" setup>
  import { ref, computed, onMounted, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { Button } from '@/components/ui/button'
  import { Input } from '@/components/ui/input'
  import { Label } from '@/components/ui/label'
  import { Textarea } from '@/components/ui/textarea'
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select'
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '@/components/ui/dialog'
  import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationFirst,
    PaginationItem,
    PaginationLast,
    PaginationNext,
    PaginationPrevious,
  } from '@/components/ui/pagination'
  import ProductCard from '@/components/ProductCard.vue'
  import type { Product, ProductsResponse } from '@/types'
  import { PAGE_SIZE } from '@/constants'
  import { useAuth } from '@/composables/useAuth'

  const CATEGORIES = ['T-shirts', 'Pantalons', 'Robes', 'Vestes', 'Accessoires']

  const route = useRoute()
  const router = useRouter()
  const { isAdmin, token } = useAuth()

  const products = ref<Product[]>([])
  const totalItems = ref(0)
  const totalPages = computed(() => Math.ceil(totalItems.value / PAGE_SIZE))
  const currentPage = ref(Number(route.query.page) || 1)
  const sort = ref<string>((route.query.sort as string) || '')
    // ++ search : texte entré par l'utilisateur dans la barre de recherche
  const search = ref<string>((route.query.search as string) || '')
  const loading = ref(false)
  const error = ref(false)

  // + fetchProducts : ajout du paramètre searchValue pour la recherche
  async function fetchProducts(page: number, sortValue: string, searchValue: string) {
    loading.value = true
    error.value = false
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) })
      if (sortValue) params.set('sort', sortValue)
      // ++ search : vérifie si searchValue n'est pas vide avant de l'ajouter aux paramètres
      if (searchValue) params.set('search', searchValue)
      const res = await fetch(`/api/products?${params}`)
      if (!res.ok) throw new Error()
      const json: ProductsResponse = await res.json()
      products.value = json.data
      totalItems.value = json.total
    } catch {
      error.value = true
    } finally {
      loading.value = false
    }
  }

  // ++ buildQuery : construit l'objet de requête à partir des paramètres actuels
  function buildQuery(): Record<string, string> {
    const q: Record<string, string> = {}
    if (currentPage.value > 1) q.page = String(currentPage.value)
    if (sort.value) q.sort = sort.value
    if (search.value) q.search = search.value
    return q
  }

  function onPageChange(page: number) {
    currentPage.value = page

    // ++ buildQuery : construit l'objet de requête à partir des paramètres actuels
    router.push({ query: buildQuery() })
  }

  function onSortChange(value: string) {
    currentPage.value = 1
    const q: Record<string, string> = {}

    if (value) q.sort = value
    if (search.value) q.search = search.value
    router.push({ query: q })
  }

  // ++ onSearchInput : gère la recherche avec un délai d'attente pour éviter les appels API trop fréquents
  let searchTimer: ReturnType<typeof setTimeout> | null = null
  function onSearchInput() {
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
      currentPage.value = 1
      router.push({ query: buildQuery() })
    }, 400)
  }

  // + watch : surveille les changements de currentPage, sort et search et appelle fetchProducts
  watch([currentPage, sort, search], ([page, sortValue, searchValue]) =>
    fetchProducts(page, sortValue, searchValue),
  )
  onMounted(() => fetchProducts(currentPage.value, sort.value, search.value))

  // --- Formulaire ajout / modification ---
  const formDialogOpen = ref(false)
  const isEditing = ref(false)
  const editingId = ref<number | null>(null)
  const formError = ref('')
  const formLoading = ref(false)

  const emptyForm = () => ({ name: '', description: '', price: '', stock: '', categoryName: '' })
  const form = ref(emptyForm())

  function openCreate() {
    isEditing.value = false
    editingId.value = null
    form.value = emptyForm()
    formError.value = ''
    formDialogOpen.value = true
  }

  function openEdit(product: Product) {
    isEditing.value = true
    editingId.value = product.id
    form.value = {
      name: product.name,
      description: product.description ?? '',
      price: String(product.price),
      stock: String(product.stock),
      categoryName: product.category.name,
    }
    formError.value = ''
    formDialogOpen.value = true
  }

  async function submitForm() {
    formError.value = ''
    formLoading.value = true
    try {
      const body = {
        name: form.value.name,
        description: form.value.description || null,
        price: Number(form.value.price),
        stock: Number(form.value.stock),
        categoryName: form.value.categoryName,
      }
      const url = isEditing.value ? `/api/products/${editingId.value}` : '/api/products'
      const method = isEditing.value ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token.value}`,
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const { message } = await res.json()
        throw new Error(message)
      }
      formDialogOpen.value = false
      await fetchProducts(currentPage.value, sort.value, search.value)
    } catch (e) {
      formError.value = e instanceof Error ? e.message : 'Une erreur est survenue.'
    } finally {
      formLoading.value = false
    }
  }

  // --- Suppression ---
  const deleteDialogOpen = ref(false)
  const productToDelete = ref<Product | null>(null)
  const deleteError = ref('')
  const deleteLoading = ref(false)

  function openDeleteConfirm(product: Product) {
    productToDelete.value = product
    deleteError.value = ''
    deleteDialogOpen.value = true
  }

  async function confirmDelete() {
    if (!productToDelete.value) return
    deleteError.value = ''
    deleteLoading.value = true
    try {
      const res = await fetch(`/api/products/${productToDelete.value.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token.value}` },
      })
      if (!res.ok) {
        const { message } = await res.json()
        throw new Error(message)
      }
      deleteDialogOpen.value = false
      await fetchProducts(currentPage.value, sort.value, search.value)
    } catch (e) {
      deleteError.value = e instanceof Error ? e.message : 'Une erreur est survenue.'
    } finally {
      deleteLoading.value = false
    }
  }
</script>
