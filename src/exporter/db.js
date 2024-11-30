import { config } from 'dotenv'
import mysql from 'mysql2'

const { parsed: env } = config()

const getConnection = (() => {
  let cache

  return async () => {
    if (cache) return cache

    const db = mysql.createConnection({
      host: env.HOST,
      user: env.user,
      password: env.PASSWORD,
      database: env.DATABASE
    })

    const promise = db.promise()

    cache = { db, promise }
    return cache
  }
})()

export { getConnection }
