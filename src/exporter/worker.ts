import { parentPort } from 'worker_threads'
import { getConnection } from '#src/exporter/db'
import { loadConfiguration } from '#src/exporter/config/configLoader'

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

  createTableStatements(Object.keys(tables))

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

  return results.reduce((collected, next) => {
    return `${collected}${(next as Array<Record<string, string>>)[0]['Create Table']};\n\n`
  }, '')
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const createDataStatements = async () => {
  return ''
}

const errorHandler = (uuid: string, { message }: Error) => {
  parentPort?.postMessage({
    success: false,
    message: `Task ${uuid} failed because ${message}`
  })
}
