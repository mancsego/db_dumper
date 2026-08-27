import Fastify from 'fastify'
import indexRouter from './src/routes/index'

const server = Fastify({
  logger: process.env.NODE_ENV !== 'production',
  disableRequestLogging: true
})

server.register(indexRouter)

server.setNotFoundHandler((request, reply) => {
  reply.code(404).send({
    statusCode: 404,
    error: 'Not Found',
    message: `Route ${request.method}:${request.url} not found`
  })
})

const start = async () => {
  const port = Number(process.env.PORT || 3000)
  const host = process.env.SERVER_HOST || '0.0.0.0'

  try {
    await server.listen({ port, host })
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

if (process.env.NODE_ENV !== 'test') {
  start()
}

export default server
