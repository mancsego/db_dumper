import { FastifyPluginAsync } from 'fastify'
import { Worker } from 'worker_threads'
import path from 'path'

let uuid: string | null = null

const routes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/favicon.ico', async (_, reply) => {
    return reply.code(204).send()
  })

  fastify.get(
    '/',
    {
      schema: {
        response: {
          202: {
            type: 'object',
            properties: { data: { type: 'string' } }
          },
          429: {
            type: 'object',
            properties: { data: { type: 'string' } }
          }
        }
      }
    },
    async (_, reply) => {
      if (uuid) {
        return reply.code(429).send({
          data: `Task ${uuid} is still in progress.`
        })
      }

      startWorker()

      return reply.code(202).send({
        data: `Task ${uuid} started`
      })
    }
  )
}

const startWorker = () => {
  const worker = new Worker(path.resolve('src/exporter/worker.ts'))

  uuid = crypto.randomUUID()
  const currentUuid = uuid
  console.log(`Starting worker with ${currentUuid}`)

  worker.postMessage(currentUuid)

  worker.on('message', ({ message }) => {
    console.log(message)
    if (uuid === currentUuid) uuid = null
  })

  worker.on('error', (err) => {
    console.error(`Worker error for task ${currentUuid}:`, err)
    if (uuid === currentUuid) uuid = null
  })

  worker.on('exit', (code) => {
    if (code !== 0) {
      console.error(
        `Worker stopped with non-zero exit code ${code} for task ${currentUuid}`
      )
    }
    if (uuid === currentUuid) uuid = null
  })
}

export default routes
