import express from 'express'
import { getConnection } from '#src/exporter/db.js'
const router = express.Router()

router.get('/favicon.ico', (_, res) => res.status(204))

router.get('/', async function (_, res) {
  res.json({ data: 'ok' })
})

export default router
