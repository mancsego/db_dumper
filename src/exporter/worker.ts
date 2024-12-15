import { parentPort } from 'worker_threads'
import { loadConfiguration } from '#src/exporter/config/configLoader'
import {
  createTableStatements,
  createDataStatements
} from '#src/exporter/StatementService'
import { cleanUpTmpFiles } from '#src/exporter/FileService'

const fileTemplate = 'dump.sql'

parentPort?.on('message', async (uuid) => {
  try {
    await buildDump(uuid)
  } catch (e) {
    errorHandler(uuid, e as Error)
  }
})

const buildDump = async (uuid: string) => {
  const definition = await loadConfiguration()

  const createTables = await createTableStatements(definition)
  const createData = await createDataStatements(definition)

  // console.log(createTables)
  // console.log(createData)

  parentPort?.postMessage({
    success: true,
    message: `Task ${uuid} successfully completed. Dump file: ${fileTemplate}`
  })
  cleanUpTmpFiles()
}

const errorHandler = (uuid: string, { message }: Error) => {
  parentPort?.postMessage({
    success: false,
    message: `Task ${uuid} failed because ${message}`
  })
}
