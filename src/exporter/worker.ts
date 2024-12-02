import { parentPort } from 'worker_threads'
import { getConnection } from '#src/exporter/db'
import { loadConfiguration } from '#src/exporter/config/configLoader'
import { EXPORT_TYPES, CONFIG_OBJECT } from './config/types'

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

  // console.log(createTables, createData)

  parentPort?.postMessage({
    success: true,
    message: `Task ${uuid} successfully completed. Dump file: ${fileTemplate}`
  })
}

const createTableStatements = async (tables: Array<string>) => {
  const { connection } = await getConnection()

  const results = await Promise.all(
    tables.map(async (table) => {
      const [rows] = await connection.query(`SHOW CREATE TABLE \`${table}\``)
      return rows // Adjust based on actual result structure
    })
  )

  return results.reduce(
    (collected: string, next) =>
      `${collected}${(next as Array<Record<string, string>>)[0]['Create Table']};\n\n`,
    ''
  )
}

const createDataStatements = async (
  definition: Record<string, CONFIG_OBJECT>
) => {
  const { connection } = await getConnection()

  for (const [table, config] of Object.entries(definition)) {
    if (config.type !== EXPORT_TYPES.DATA) continue

    const [rows] = await connection.query(`SELECT * FROM \`${table}\``)
    const statements = createInsertStatements(
      table,
      rows as Array<Record<string, unknown>>
    )
    console.log(statements)
  }
  return 'con'
}

const createInsertStatements = (
  table: string,
  rows: Array<Record<string, unknown>>
) => {
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
