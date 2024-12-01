import { parentPort } from 'worker_threads'

parentPort?.on('message', async () => {
  try {
    const uuid = crypto.randomUUID()
    console.log(`Export task started: ${uuid}`)
    parentPort?.postMessage({
      success: true,
      message: `Export complete: ${uuid}`
    })
  } catch (error) {
    parentPort?.postMessage({ success: false, error: (error as Error).message })
  }
})
