import express, { Request, Response} from 'express'
import { getConnection } from '#src/exporter/db.js'
const router = express.Router()

router.get('/favicon.ico', (_: Request, res: Response) => {
  res.status(204)
})

router.get('/', async (_: Request, res: Response) => {
  const { connection } = await getConnection()
  const [data] = await connection.query('SELECT * FROM users')
  
  res.json({ data })
})

export default router
