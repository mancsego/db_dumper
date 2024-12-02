import { parentPort } from 'worker_threads'

const fileTemplate = 'dump.sql'

parentPort?.on('message', async (uuid) => {
  try {
    console.log('start')

    setTimeout(() => {
      parentPort?.postMessage({
        success: true,
        message: `Task ${uuid} successfully completed. Dump file: ${fileTemplate}`
      })
    }, 5000)
  } catch (error) {
    parentPort?.postMessage({
      success: false,
      message: `Task ${uuid} failed because ${(error as Error).message}`
    })
  }
})
