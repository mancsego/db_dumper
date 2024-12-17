import fs, { WriteStream } from 'fs'
import path from 'path'
import { ConfigObject } from './config/types'

type PrimaryStream = {
  save: CallableFunction
  close: CallableFunction
}

const TMP_FOLDER = path.resolve('tmp')
const DUMP_FILE = path.resolve('dumps/dump.sql')

const openPrimaryStream = (table: string): PrimaryStream => {
  const fileName = _createTmpFileName(table)
  fs.unlink(fileName, () => {})
  const stream = fs.createWriteStream(fileName)

  return {
    save: (primary: string | undefined) => {
      if (!primary) return

      stream.write(`${primary},`)
    },
    close: () => {
      stream.close()
    }
  }
}

const readPrimaries = (() => {
  let cache: Record<string, string[]> = {}

  return ({ dependencies }: ConfigObject): Record<string, string[]> => {
    dependencies?.forEach((table) => {
      if (cache[table]) return

      const primaries = fs
        .readFileSync(_createTmpFileName(table), { encoding: 'utf8' })
        .split(',')
        .filter(Boolean)

      cache = { ...cache, [table]: primaries }
    })

    return cache
  }
})()

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

const _createTmpFileName = (table: string): string =>
  `${TMP_FOLDER}/${table}_primaries.tmp`

export { dumpStream, openPrimaryStream, readPrimaries, cleanUpTmpFiles }
