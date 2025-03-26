import { config } from 'dotenv'
import mysql, { Connection } from 'mysql2'
import { Connection as PromiseConnection } from 'mysql2/promise'
import { loadConfiguration } from './config/configLoader'
import { ColumnConfig } from './config/types'

type DatabaseConnection = {
  db: Connection
  connection: PromiseConnection
}

const { parsed: env } = config()

const getConnection = (() => {
  let cache: DatabaseConnection

  return async (): Promise<DatabaseConnection> => {
    if (cache) return cache

    const columnConfigs = await _collectConfigPerTable()
    const db = mysql.createConnection({
      host: env?.HOST,
      user: env?.DB_USER,
      password: env?.DB_PASSWORD,
      database: env?.TARGET_DB,
      typeCast: (field, next) => {
        if (['VAR_STRING'].includes(field.type))
          return _replaceDeprecated(next() as string)

        if (field.type !== 'BIT')
          return _getValue(columnConfigs, field.name, next())

        return field.buffer()?.readUInt8(0) ?? 0
      }
    })

    const connection = db.promise()

    cache = { db, connection }
    return cache
  }
})()

const _collectConfigPerTable = async (): Promise<
  Record<string, ColumnConfig>
> => {
  const def = await loadConfiguration()
  return def.reduce(
    (cur, { table, columns }) => ({
      ...cur,
      [table]: columns
    }),
    {}
  )
}

const _getValue = (
  columnConfigs: Record<string, ColumnConfig>,
  table: string,
  value: unknown
) => {
  const filter = _getFilterMethod(columnConfigs[table], table)
  const res = filter(value)

  return shouldStringify(res) ? `"${res}"` : res
}

const _getFilterMethod = (
  columnConfig: Record<string, CallableFunction> | undefined,
  column: string
) => (columnConfig ?? {})[column] ?? ((v: unknown) => v)

const STRINGIFY = ['object', 'string']
const shouldStringify = (x: unknown) =>
  x !== 'DEFAULT' && x !== null && STRINGIFY.includes(typeof x)

const _replaceDeprecated = (statement: string): string =>
  statement?.replace(/'0000-00-00 00:00:00'/g, 'CURRENT_TIMESTAMP')

export { getConnection }
