import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAdmin, AuthRequest } from '../middlewares/auth.js'

const router = Router()
const prisma = new PrismaClient()

router.get('/', async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 12))
  const skip = (page - 1) * limit

  const sort = req.query.sort
  const orderBy =
    sort === 'price_asc'
      ? { price: 'asc' as const }
      : sort === 'price_desc'
        ? { price: 'desc' as const }
        : { createdAt: 'desc' as const }

  // + search : recherche de produits par nom ou description (informations visibles par l'utilisateur)
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
  const where = search
    ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
      ],
    }
    : {}

  const [data, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: { category: { select: { name: true } } },
    }),
    prisma.product.count({ where }),
  ])

  res.json({
    data,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  })
})

router.post('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { name, description, price, stock, categoryName } = req.body
  if (!name || price === undefined || stock === undefined || !categoryName) {
    res.status(400).json({ message: 'Champs obligatoires manquants.' })
    return
  }

  const category = await prisma.category.findUnique({ where: { name: categoryName } })
  if (!category) {
    res.status(400).json({ message: 'Catégorie introuvable.' })
    return
  }

  const product = await prisma.product.create({
    data: { name, description: description ?? null, price: Number(price), stock: Number(stock), categoryId: category.id },
    include: { category: { select: { name: true } } },
  })
  res.status(201).json(product)
})

router.put('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)
  const { name, description, price, stock, categoryName } = req.body

  const existing = await prisma.product.findUnique({ where: { id } })
  if (!existing) {
    res.status(404).json({ message: 'Produit introuvable.' })
    return
  }

  let categoryId = existing.categoryId
  if (categoryName) {
    const category = await prisma.category.findUnique({ where: { name: categoryName } })
    if (!category) {
      res.status(400).json({ message: 'Catégorie introuvable.' })
      return
    }
    categoryId = category.id
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(price !== undefined && { price: Number(price) }),
      ...(stock !== undefined && { stock: Number(stock) }),
      categoryId,
    },
    include: { category: { select: { name: true } } },
  })
  res.json(product)
})

router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)

  const existing = await prisma.product.findUnique({ where: { id } })
  if (!existing) {
    res.status(404).json({ message: 'Produit introuvable.' })
    return
  }

  await prisma.product.delete({ where: { id } })
  res.status(204).send()
})

export default router
