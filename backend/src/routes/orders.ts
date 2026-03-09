import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth, AuthRequest } from '../middlewares/auth.js'

const router = Router()
const prisma = new PrismaClient()

// Création d'une commande à partir des articles envoyés par le client.
// Vérifie le stock de chaque produit, crée la commande et ses lignes,
// décrémente le stock dans une seule transaction.
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
    // items : tableau d'objets { productId: number, quantity: number }
    const items: { productId: number; quantity: number }[] = req.body.items

    // Validation du corps de la requête
    if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({ message: 'Le panier est vide ou invalide.' })
        return
    }

    // Vérification que chaque entrée a les bons champs
    for (const item of items) {
        if (!item.productId || !item.quantity || item.quantity < 1) {
            res.status(400).json({ message: 'Données de panier invalides.' })
            return
        }
    }

    try {
        // Récupération de tous les produits concernés en une seule requête
        const productIds = items.map((i) => i.productId)
        const products = await prisma.product.findMany({
            where: { id: { in: productIds } },
        })

        // Vérification de l'existence des produits
        if (products.length !== productIds.length) {
            res.status(404).json({ message: 'Un ou plusieurs produits sont introuvables.' })
            return
        }

        // Vérification du stock
        for (const item of items) {
            const product = products.find((p) => p.id === item.productId)!
            if (product.stock < item.quantity) {
                res.status(409).json({
                    message: `Stock insuffisant pour "${product.name}". Disponible : ${product.stock}.`,
                })
                return
            }
        }

        // Calcul du total de la commande
        const total = items.reduce((sum, item) => {
            const product = products.find((p) => p.id === item.productId)!
            return sum + Number(product.price) * item.quantity
        }, 0)

        // Transaction : création commande + lignes + décrémentation stock
        const order = await prisma.$transaction(async (tx) => {
            // Création de la commande principale
            const newOrder = await tx.order.create({
                data: {
                    userId: req.userId!,
                    total,
                    // Création des lignes OrderItem en même temps
                    orderItems: {
                        create: items.map((item) => {
                            const product = products.find((p) => p.id === item.productId)!
                            return {
                                productId: item.productId,
                                quantity: item.quantity,
                                unitPrice: Number(product.price),
                            }
                        }),
                    },
                },
                include: {
                    orderItems: {
                        include: { product: { select: { id: true, name: true } } },
                    },
                },
            })

            // Décrémentation du stock pour chaque produit commandé
            for (const item of items) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: { stock: { decrement: item.quantity } },
                })
            }

            return newOrder
        })

        // Réponse 201 Created avec le détail de la commande
        res.status(201).json(order)
    } catch (err) {
        console.error('Erreur lors de la création de la commande :', err)
        res.status(500).json({ message: 'Erreur interne du serveur.' })
    }
})

// Retourne toutes les commandes de l'utilisateur connecté,
// tri de la plus récente à la plus ancienne.
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
        const orders = await prisma.order.findMany({
            where: { userId: req.userId! },
            orderBy: { createdAt: 'desc' },
            include: {
                orderItems: {
                    include: {
                        product: {
                            select: { id: true, name: true, category: { select: { name: true } } },
                        },
                    },
                },
            },
        })

        res.json(orders)
    } catch (err) {
        console.error('Erreur lors de la récupération des commandes :', err)
        res.status(500).json({ message: 'Erreur interne du serveur.' })
    }
})

export default router
