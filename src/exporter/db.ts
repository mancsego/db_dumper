import { config } from 'dotenv'
import mysql, { Connection } from 'mysql2'
import { Connection as PromiseConnection } from 'mysql2/promise'
import createTypeCaster from './formatter'

type DatabaseConnection = {
  db: Connection
  connection: PromiseConnection
}

const { parsed: env } = config()

let cache: DatabaseConnection | null = null

const getConnection = async (): Promise<DatabaseConnection> => {
  if (cache) return cache

  const typeCaster = await createTypeCaster()
  const db = mysql.createConnection({
    host: process.env.HOST ?? env?.HOST ?? '127.0.0.1',
    user: process.env.DB_USER ?? env?.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? env?.DB_PASSWORD ?? 'root',
    database: process.env.TARGET_DB ?? env?.TARGET_DB ?? 'db',
    typeCast: typeCaster
  })

  const connection = db.promise()

  cache = { db, connection }
  return cache
}

const closeConnection = async (): Promise<void> => {
  if (cache) {
    try {
      await cache.connection.end()
    } catch {
      cache.db.destroy()
    } finally {
      cache = null
    }
  }
}

export { getConnection, closeConnection }
