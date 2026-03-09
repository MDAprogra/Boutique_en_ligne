<template>
  <header class="border-b bg-background sticky top-0 z-50">
    <div class="container mx-auto flex h-14 items-center justify-between px-4">
      <RouterLink :to="{ name: 'home' }" class="text-lg font-bold tracking-tight">
        Boutique en Ligne
      </RouterLink>

      <div class="flex items-center gap-3">
        <Button variant="ghost" size="sm" as-child>
          <RouterLink :to="{ name: 'contact' }">Contact</RouterLink>
        </Button>
        <Button v-if="isAuthenticated" variant="ghost" size="sm" as-child>
          <RouterLink :to="{ name: 'orders' }">Mes commandes</RouterLink>
        </Button>
        <CartDrawer />
        <template v-if="isAuthenticated && user">
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <button class="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-accent transition-colors">
                <Avatar class="h-8 w-8">
                  <AvatarFallback class="text-xs font-semibold">
                    {{ initials }}
                  </AvatarFallback>
                </Avatar>
                <span class="text-sm font-medium">{{ user.firstName }} {{ user.lastName }}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="w-44">
              <DropdownMenuLabel class="text-xs text-muted-foreground">
                {{ user.email }}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem @click="handleLogout" class="cursor-pointer text-destructive focus:text-destructive">
                Se déconnecter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </template>
        <Button v-else size="sm" as-child>
          <RouterLink :to="{ name: 'auth' }">Se connecter</RouterLink>
        </Button>
      </div>
    </div>
  </header>
</template>

<script lang="ts" setup>
  import { computed } from 'vue'
  import { useRouter } from 'vue-router'
  import { useAuth } from '@/composables/useAuth'
  import { Button } from '@/components/ui/button'
  import { Avatar, AvatarFallback } from '@/components/ui/avatar'
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from '@/components/ui/dropdown-menu'
  import CartDrawer from '@/components/CartDrawer.vue'

  const { user, isAuthenticated, logout } = useAuth()
  const router = useRouter()
  const initials = computed(() => {
    if (!user.value) return ''
    return `${user.value.firstName[0]}${user.value.lastName[0]}`.toUpperCase()
  })

  function handleLogout() {
    logout()
    router.push({ name: 'home' })
  }
</script>

