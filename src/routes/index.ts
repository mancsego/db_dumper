import express, { Request, Response } from 'express'
import { Worker } from 'worker_threads'
import path from 'path'

let uuid: string | null = null
const router = express.Router()

router.get('/favicon.ico', (_: Request, res: Response) => {
  res.status(204)
})

router.get('/', async (_: Request, res: Response) => {
  if (uuid) {
    res.status(429).json({ data: `Task ${uuid} is still in progress.` })
    return
  }

  startWorker()

  res.status(202).json({ data: `Task ${uuid} started` })
})

const startWorker = () => {
  const worker = new Worker(path.resolve('src/exporter/worker.ts'), {
    execArgv: ['-r', 'ts-node/register']
  })

  uuid = crypto.randomUUID()
  console.log(`Starting worker with ${uuid}`)

  worker.postMessage(uuid)
  worker.on('message', ({ message }) => {
    console.log(message)
    uuid = null
  })
}

export default router
