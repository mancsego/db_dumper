import { parentPort } from 'worker_threads'
import { getConnection } from '#src/exporter/db'
import { loadConfiguration } from '#src/exporter/config/configLoader'
import { ColumnConfig, ExportTypes, ImportDefinition } from './config/types'
import { RowDataPacket } from 'mysql2'
import { log } from 'console'

const fileTemplate = 'dump.sql'
let definition: ImportDefinition = {}

parentPort?.on('message', async (uuid) => {
  try {
    await buildDump(uuid)
  } catch (e) {
    errorHandler(uuid, e as Error)
  }
})

const buildDump = async (uuid: string) => {
  definition = await loadConfiguration()

  const createTables = await createTableStatements()
  const createData = await createDataStatements()

  // console.log(createTables)
  console.log(createData)

  parentPort?.postMessage({
    success: true,
    message: `Task ${uuid} successfully completed. Dump file: ${fileTemplate}`
  })

  definition = {}
}

const createTableStatements = async () => {
  const tables = Object.keys(definition)
  const { connection } = await getConnection()

  const results = await Promise.all(
    tables.map(async (table) => {
      const [rows] = await connection.query<RowDataPacket[]>(
        `SHOW CREATE TABLE ${table}`
      )
      return rows
    })
  )

  return results.reduce(
    (collected: string, next: RowDataPacket[]) =>
      `${collected}${next[0]['Create Table']};`,
    ''
  )
}

const createDataStatements = async () => {
  const { connection } = await getConnection()

  let statements = ''
  for (const [table, config] of Object.entries(definition)) {
    if (config.type === ExportTypes.STRUCTURE_ONLY) continue

    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT * FROM ${table}`
    )
    statements += createInsertStatements(table, rows)
  }

  return statements
}

const createInsertStatements = (table: string, rows: RowDataPacket[]) => {
  return `INSERT INTO ${table} VALUES ${rows.reduce(valueReducer(table), '').slice(0, -1)};`
}

const valueReducer =
  (table: string) => (values: string, next: Record<string, unknown>) => {
    const config: ColumnConfig = definition[table].columns ?? {}

    const row = Object.keys(next).reduce(
      (collected: string, column: string) => {
        const clb = config[table] ?? fallbackFilter
        return `${collected}${clb(next[column])},`
      },
      ''
    )

    return row.slice(0, -1)
  }

const fallbackFilter = (v: unknown) => v

const errorHandler = (uuid: string, { message }: Error) => {
  parentPort?.postMessage({
    success: false,
    message: `Task ${uuid} failed because ${message}`
  })
}
