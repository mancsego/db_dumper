import express from 'express'
import { getConnection } from '../src/exporter/config/db.js'
var router = express.Router()

router.get('/favicon.ico', (_, res) => res.status(204))

router.get('/', async function (_, res) {
  console.log(getConnection)

  try {
    await getConnection()
  } catch (e) {
    console.log(e)
  }
  res.json({ data: 'ok' })
})

export default router
