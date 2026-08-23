import fs, { WriteStream } from 'fs'
import path from 'path'

let dumpFilePath: string = ''

const initDumpFile = (uuid: string = crypto.randomUUID()): string => {
  const dumpsDir = path.resolve('dumps')
  if (!fs.existsSync(dumpsDir)) {
    fs.mkdirSync(dumpsDir, { recursive: true })
  }

  const dateStr = new Date()
    .toLocaleDateString('de-DE')
    .replace(/\./g, '_')
  const shortUuid = uuid.substring(0, 8)

  dumpFilePath = path.resolve(dumpsDir, `dump_${dateStr}_${shortUuid}.sql`)
  return dumpFilePath
}

const getDumpFilePath = (): string => {
  if (!dumpFilePath) {
    return initDumpFile()
  }
  return dumpFilePath
}

const dumpStream = (() => {
  let stream: WriteStream | null = null

  return {
    open: (filePath: string = getDumpFilePath()) => {
      if (stream) return stream

      stream = fs.createWriteStream(filePath, { flags: 'a' })
      return stream
    },
    write: async (content: string): Promise<void> => {
      if (!stream) {
        throw new Error('Dump stream is not open.')
      }

      if (!stream.write(content)) {
        await new Promise<void>((resolve) => {
          stream?.once('drain', () => resolve())
        })
      }
    },
    close: async (): Promise<void> => {
      if (!stream) return

      await new Promise<void>((resolve) => {
        stream?.end(() => resolve())
      })
      stream = null
    }
  }
})()

const removeDump = (filePath: string = getDumpFilePath()) => {
  if (fs.existsSync(filePath)) {
    fs.unlink(filePath, () => {})
  }
}

export { dumpStream, removeDump, initDumpFile, getDumpFilePath }
