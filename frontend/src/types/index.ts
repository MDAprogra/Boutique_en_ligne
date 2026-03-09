export interface Category {
  name: string
}

export interface Product {
  id: number
  name: string
  description: string | null
  price: number
  stock: number
  category: Category
}

export interface ProductsResponse {
  data: Product[]
  total: number
  page: number
  totalPages: number
}

export interface User {
  id: number
  email: string
  firstName: string
  lastName: string
  role: 'CUSTOMER' | 'ADMIN'
}

export interface AuthResponse {
  token: string
  user: User
}


export interface CartItem {
  product: Product
  quantity: number
}
export interface OrderItem {
  id: number
  productId: number
  quantity: number
  unitPrice: number
  product: {
    id: number
    name: string
    category: { name: string }
  }
}

export interface Order {
  id: number
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
  total: number
  createdAt: string
  orderItems: OrderItem[]
}

