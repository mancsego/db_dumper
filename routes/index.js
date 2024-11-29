import express from 'express'
var router = express.Router()

router.get('/favicon.ico', (_, res) => res.status(204))

router.get('/', function (_, res) {
  res.json({ data: 'ok' })
})

export default router
