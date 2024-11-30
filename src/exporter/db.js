import { config } from 'dotenv'
import mysql from 'mysql2'

const { parsed: env } = config()

const getConnection = (() => {
  let cache

  return async () => {
    if (cache) return cache

    const db = mysql.createConnection({
      host: env.HOST,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.TARGET_DB
    })

    const promise = db.promise()

    cache = { db, promise }
    return cache
  }
})()

export { getConnection }
