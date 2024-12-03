import express, { NextFunction, Request, Response } from 'express'
import { Worker } from 'worker_threads'
import path from 'path'
import { readDump, writeDumb } from '#src/exporter/FileService'

let uuid: string | null = null
const router = express.Router()

router.get('/favicon.ico', (_: Request, res: Response) => {
  res.status(204)
})

router.get(
  '/try-read',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await readDump('123s4.sql')
      res.status(200).json({ data })
    } catch (e) {
      console.log('Hali gali')

      next(e)
    }
  }
)

router.get('/try-write', async (_req: Request, res: Response) => {
  await writeDumb('1234.sql', 'falafel\n', 'balls')

  res.status(201).json({ data: 'Content has been written into file' })
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
