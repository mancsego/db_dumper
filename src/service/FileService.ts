import fs, { WriteStream } from 'fs'
import path from 'path'

const DUMP_FILE = path.resolve(
  `dumps/dump_${new Date().toLocaleDateString('de-DE').replace(/\./g, '_')}_${crypto.randomUUID().substring(0, 5)}.sql`
)

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

const removeDump = () => {
  fs.unlink(DUMP_FILE, () => {})
}

export { dumpStream, removeDump, DUMP_FILE }
