import express, { Request, Response } from 'express'
import { Worker } from 'worker_threads'
import path from 'path'

const router = express.Router()

router.get('/favicon.ico', (_: Request, res: Response) => {
  res.status(204)
})

router.get('/', async (_: Request, res: Response) => {
  const worker = new Worker(path.resolve('src/exporter/worker.ts'), {
    execArgv: ['-r', 'ts-node/register']
  })
  worker.postMessage('Start')
  const data = 'ok'

  res.json({ data })
})

export default router
