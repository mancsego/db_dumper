import { config } from 'dotenv'
import mysql, { Connection } from 'mysql2'
import { Connection as PromiseConnection } from 'mysql2/promise'
import createTypeCaster from './formatter'

type DatabaseConnection = {
  db: Connection
  connection: PromiseConnection
}

const { parsed: env } = config()

const getConnection = (() => {
  let cache: DatabaseConnection

  return async (): Promise<DatabaseConnection> => {
    if (cache) return cache

    const typeCaster = await createTypeCaster()
    const db = mysql.createConnection({
      host: env?.HOST,
      user: env?.DB_USER,
      password: env?.DB_PASSWORD,
      database: env?.TARGET_DB,
      typeCast: typeCaster
    })

    const connection = db.promise()

    cache = { db, connection }
    return cache
  }
})()

export { getConnection }
