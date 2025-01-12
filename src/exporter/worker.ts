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
    console.log(e)
    errorHandler(uuid, e as Error)
  }
})

const buildDump = async (uuid: string) => {
  const definition = await loadConfiguration()

  await createTableStatements(definition)
  await createDataStatements(definition)

  console.log('[Cleaning up temp files...]')

  setTimeout(() => {
    cleanUpTmpFiles()
    console.log('[Cleaning up done]')
  }, 2000)

  parentPort?.postMessage({
    success: true,
    message: `Task ${uuid} successfully completed. Dump file: ${fileTemplate}`
  })
}

const errorHandler = (uuid: string, { message }: Error) => {
  parentPort?.postMessage({
    success: false,
    message: `Task ${uuid} failed because ${message}`
  })
}
