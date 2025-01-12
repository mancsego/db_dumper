import fs, { WriteStream } from 'fs'
import path from 'path'

const TMP_FOLDER = path.resolve('tmp')
const DUMP_FILE = path.resolve('dumps/dump.sql')


const cleanUpTmpFiles = (): void => {
  fs.readdir(TMP_FOLDER, (_, tmpFiles) => {
    tmpFiles.forEach((file) => {
      const filePath = path.join(TMP_FOLDER, file)

      if (!file.endsWith('.tmp')) return

      fs.unlink(filePath, () => {})
    })
  })
}

const dumpStream = (() => {
  let stream: WriteStream | null

  return {
    open: () => {
      if (stream) throw new Error('Dump stream is already open. Aborting.')

      stream = fs.createWriteStream(DUMP_FILE, { flags: 'a' })
      return stream
    },
    close: () => {
      stream?.close()
      stream = null
    }
  }
})()

export { dumpStream, cleanUpTmpFiles }
