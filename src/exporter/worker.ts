import { parentPort } from 'worker_threads'
import { loadConfiguration } from '#src/exporter/config/configLoader'
import { createDataStatements } from '#src/service/DataStatementService'
import { createTableStatements } from '#src/service/TableStatementService'
import { initDumpFile, dumpStream, removeDump } from '#src/service/FileService'
import { clearHistory } from '#src/exporter/DependencyDescriptor'
import { getDialect } from '#src/dialect/index'

parentPort?.on('message', async (uuid: string) => {
  let dumpFilePath = ''
  try {
    dumpFilePath = initDumpFile(uuid)
    clearHistory()

    await buildDump(uuid, dumpFilePath)
  } catch (e) {
    console.error(e)
    await errorHandler(uuid, dumpFilePath, e as Error)
  } finally {
    await getDialect().closeConnection()
  }
})

const buildDump = async (uuid: string, dumpFilePath: string) => {
  const definition = await loadConfiguration()

  await createTableStatements(definition)
  await createDataStatements(definition)

  const dialect = getDialect()
  const footer = await dialect.getFooterStatements(definition)
  await dumpStream.write(footer)
  await dumpStream.close()

  parentPort?.postMessage({
    success: true,
    message: `Task ${uuid} successfully completed. Dump file: ${dumpFilePath}`
  })
}

const errorHandler = async (
  uuid: string,
  dumpFilePath: string,
  error: Error
) => {
  await dumpStream.close()
  if (dumpFilePath) {
    removeDump(dumpFilePath)
  }

  parentPort?.postMessage({
    success: false,
    message: `Task ${uuid} failed because ${error.message}`
  })
}
