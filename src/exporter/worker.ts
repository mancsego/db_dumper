import { parentPort } from 'worker_threads'
import { loadConfiguration } from '#src/exporter/config/configLoader'
import { createDataStatements } from '#src/service/DataStatementService'
import { createTableStatements } from '#src/service/TableStatementService'
import { DUMP_FILE } from '#src/service/FileService'

parentPort?.on('message', async (uuid) => {
  try {
    await buildDump(uuid)
  } catch (e) {
    console.log(e)
    errorHandler(uuid, e as Error)
  }
})

const buildDump = async (uuid: string) => {
  const definition = await loadConfiguration()

  await createTableStatements(definition)
  await createDataStatements(definition)

  parentPort?.postMessage({
    success: true,
    message: `Task ${uuid} successfully completed. Dump file: ${DUMP_FILE}`
  })
}

const errorHandler = (uuid: string, { message }: Error) => {
  parentPort?.postMessage({
    success: false,
    message: `Task ${uuid} failed because ${message}`
  })
}
