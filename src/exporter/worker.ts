import { parentPort } from 'worker_threads'
import { getConnection } from '#src/exporter/db'
import { loadConfiguration } from '#src/exporter/config/configLoader'
import { ColumnExport, ExportTypes, ImportDefinition } from './config/types'
import { RowDataPacket } from 'mysql2'

const fileTemplate = 'dump.sql'

parentPort?.on('message', async (uuid) => {
  try {
    await buildDump(uuid)
  } catch (e) {
    errorHandler(uuid, e as Error)
  }
})

const buildDump = async (uuid: string) => {
  const tables = await loadConfiguration()

  const createTables = await createTableStatements(Object.keys(tables))
  const createData = await createDataStatements(tables)

  console.log(createTables)
  console.log(createData)

  parentPort?.postMessage({
    success: true,
    message: `Task ${uuid} successfully completed. Dump file: ${fileTemplate}`
  })
}

const createTableStatements = async (tables: Array<string>) => {
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

const createDataStatements = async (definition: ImportDefinition) => {
  const { connection } = await getConnection()

  for (const [table, config] of Object.entries(definition)) {
    if (config.type === ExportTypes.STRUCTURE_ONLY) continue

    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT * FROM ${table}`
    )
    return createInsertStatements(table, rows)
  }
}

const createInsertStatements = (table: string, rows: RowDataPacket[]) => {
  const values = rows
    .reduce(
      (collected, next) => `${collected}(${Object.values(next).join(',')}),`,
      ''
    )
    .slice(0, -1)

  return `INSERT INTO ${table} VALUES ${values};`
}

const errorHandler = (uuid: string, { message }: Error) => {
  parentPort?.postMessage({
    success: false,
    message: `Task ${uuid} failed because ${message}`
  })
}
