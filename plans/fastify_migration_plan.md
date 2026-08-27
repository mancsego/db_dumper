# Implementation Plan: Express to Fastify Migration

Migrate the HTTP server layer from **Express** to **Fastify** to benefit from Fastify's lower overhead, higher throughput, built-in schema serialization (`fast-json-stringify`), and first-class TypeScript support.

---

## Motivation & Benefits

1. **Throughput & Latency**: Fastify is significantly faster than Express (up to 4–5x higher requests/sec and lower latency), making it ideal for microservices and API gateways.
2. **First-Class TypeScript Support**: Native typing for requests, replies, schemas, and plugins without requiring external `@types/*` packages.
3. **Schema-Based Serialization**: Using JSON Schema for route responses optimizes payload serialization speed and enforces API contracts.
4. **Clean Plugin Architecture**: Fastify's encapsulation model makes routes, worker services, and lifecycle hooks modular and testable.
5. **Built-in Async/Await**: Native async handler support without needing custom async-wrapper middleware.

---

## User Review Required

> [!NOTE] > **Host Binding**: Fastify listens on `127.0.0.1` by default. For containerized deployments (e.g. Docker), it will be configured with `host: '0.0.0.0'` (or configurable via `HOST` environment variable) to ensure incoming container traffic is accepted.

---

## Proposed Changes

### 1. Dependencies Update

#### `package.json`

- **Remove**: `express`, `http-errors`, `@types/express`
- **Add**: `fastify` (`^5.0.0` or `^4.28.0`), `@fastify/sensible` (optional, for standard HTTP error helpers)

---

### 2. Application Entry Point Refactor

#### `app.ts`

- Replace Express initialization with `Fastify({ logger: true })`.
- Register route plugins using `fastify.register()`.
- Add custom 404 handler via `fastify.setNotFoundHandler()`.
- Add global error handler via `fastify.setErrorHandler()`.
- Implement graceful shutdown handlers (`SIGINT`, `SIGTERM`).
- Export Fastify app instance (useful for testing with `fastify.inject()`).

```typescript
import Fastify from 'fastify'
import indexRouter from './src/routes/index'

const server = Fastify({
  logger: process.env.NODE_ENV !== 'production'
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
    console.log(`Server listening on http://${host}:${port}`)
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

if (process.env.NODE_ENV !== 'test') {
  start()
}

export default server
```

---

### 3. Routes & Worker Plugin Migration

#### `src/routes/index.ts`

- Convert from Express `Router` to Fastify plugin function (`FastifyPluginAsync`).
- Implement schema definitions for response serialization:
  - `202 Accepted`: `{ data: { type: 'string' } }`
  - `429 Too Many Requests`: `{ data: { type: 'string' } }`
  - `204 No Content` for `/favicon.ico`
- Maintain identical worker dispatching and concurrency-limiting logic.

```typescript
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
  const worker = new Worker(path.resolve('src/exporter/worker.ts'), {
    execArgv: ['-r', 'ts-node/register']
  })

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
```

---

### 4. Documentation & Configuration

#### `README.md` & `AGENTS.md`

- Update framework references from Express to Fastify.
- Document any new environment variables (`SERVER_HOST`, `PORT`).

---

## Verification Plan

### Automated / Code Validation

1. Install Fastify dependencies: `npm install fastify` & `npm uninstall express http-errors @types/express`.
2. Verify TypeScript compilation passes without errors (`tsc --noEmit`).
3. Run linting checks: `npm run lint`.

### Functional Verification

1. **Health / Favicon Check**:
   ```bash
   curl -i http://localhost:3000/favicon.ico
   # Expect HTTP 204 No Content
   ```
2. **Export Task Initiation (`202 Accepted`)**:
   ```bash
   curl -i http://localhost:3000/
   # Expect HTTP 202 Accepted with {"data": "Task <uuid> started"}
   ```
3. **Concurrency Throttling (`429 Too Many Requests`)**:
   - Send consecutive requests immediately while a dump is active and verify HTTP 429 is returned.
4. **404 Route Handling**:
   ```bash
   curl -i http://localhost:3000/non-existent-route
   # Expect HTTP 404 Not Found JSON response
   ```
