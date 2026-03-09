import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAdmin, AuthRequest } from '../middlewares/auth.js'

const router = Router()
const prisma = new PrismaClient()

// Toutes les routes de ce fichier nécessitent le rôle ADMIN

// Retourne un objet avec toutes les statistiques nécessaires à la page d'admin.
router.get('/', requireAdmin, async (_req: AuthRequest, res: Response) => {
    try {
        // Exécution de toutes les requêtes en parallèle pour de meilleures performances
        const [
            totalOrders,
            totalRevenue,
            totalUsers,
            ordersByStatus,
            topProducts,
            revenuePerDay,
        ] = await Promise.all([

            // Nombre total de commandes
            prisma.order.count(),

            // Chiffre d'affaires total
            prisma.order.aggregate({ _sum: { total: true } }),

            // Nombre total de comptes utilisateurs
            prisma.user.count({ where: { role: 'CUSTOMER' } }),

            // Répartition des commandes par statut
            prisma.order.groupBy({
                by: ['status'],
                _count: { _all: true },
            }),

            // Top 5 des produits les plus vendus
            prisma.orderItem.groupBy({
                by: ['productId'],
                _sum: { quantity: true },
                orderBy: { _sum: { quantity: 'desc' } },
                take: 5,
            }),

            // Chiffre d'affaires quotidien sur les 30 derniers jours
            prisma.$queryRaw<{ day: Date; revenue: number }[]>`
        SELECT
          DATE("createdAt") AS day,
          SUM(total)::float AS revenue
        FROM "Order"
        WHERE "createdAt" >= NOW() - INTERVAL '30 days'
        GROUP BY DATE("createdAt")
        ORDER BY day ASC
      `,
        ])

        const productIds = topProducts.map((t) => t.productId)
        const products = await prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true, category: { select: { name: true } } },
        })

        const topProductsWithNames = topProducts.map((t) => {
            const product = products.find((p) => p.id === t.productId)
            return {
                productId: t.productId,
                name: product?.name ?? `Produit #${t.productId}`,
                category: product?.category.name ?? '—',
                totalQuantity: t._sum.quantity ?? 0,
            }
        })

        res.json({
            totalOrders,
            totalRevenue: Number(totalRevenue._sum.total ?? 0),
            totalUsers,
            
            ordersByStatus: Object.fromEntries(
                ordersByStatus.map((s) => [s.status, s._count._all]),
            ),
            topProducts: topProductsWithNames,
            // Formatage des dates ISO
            revenuePerDay: revenuePerDay.map((r) => ({
                day: new Date(r.day).toISOString().slice(0, 10),
                revenue: r.revenue,
            })),
        })
    } catch (err) {
        console.error('Erreur stats :', err)
        res.status(500).json({ message: 'Erreur interne du serveur.' })
    }
})

export default router
