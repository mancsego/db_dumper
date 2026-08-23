import express, { Request, Response } from 'express'
import { Worker } from 'worker_threads'
import path from 'path'

let uuid: string | null = null
const router = express.Router()

router.get('/favicon.ico', (_: Request, res: Response) => {
  res.status(204).end()
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
  const currentUuid = uuid
  console.log(`Starting worker with ${currentUuid}`)

  worker.postMessage(currentUuid)

  worker.on('message', ({ message }) => {
    console.log(message)
    if (uuid === currentUuid) {
      uuid = null
    }
  })

  worker.on('error', (err) => {
    console.error(`Worker error for task ${currentUuid}:`, err)
    if (uuid === currentUuid) {
      uuid = null
    }
  })

  worker.on('exit', (code) => {
    if (code !== 0) {
      console.error(
        `Worker stopped with non-zero exit code ${code} for task ${currentUuid}`
      )
    }
    if (uuid === currentUuid) {
      uuid = null
    }
  })
}

export default router
