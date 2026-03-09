import 'dotenv/config'
import express, { Request, Response } from 'express'
import cors from 'cors'
import productsRouter from './routes/products.js'
import authRouter from './routes/auth.js'
import ordersRouter from './routes/orders.js'

const app = express()
const PORT = process.env.PORT ?? 3000

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' })
})

app.use('/api/products', productsRouter)
app.use('/api/auth', authRouter)
// Route des commandes (panier → checkout, historique utilisateur)
app.use('/api/orders', ordersRouter)


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
