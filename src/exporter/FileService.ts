import fs from 'fs'
import fsPromise from 'fs/promises'
import path from 'path'
import { ConfigObject } from './config/types'

type PrimaryStream = {
  save: CallableFunction
  close: CallableFunction
}

const TMP_FOLDER = path.resolve('tmp')

const writeDumb = async (fileName: string, ...content: string[]) => {
  const fileContent = content.join('')

  try {
    await fsPromise.writeFile(path.resolve(`dumps/${fileName}`), fileContent)
  } catch (e) {
    console.error('Failed to write dump to file: ', e)
  }
}

const readDump = async (fileName: string) => {
  try {
    const content = await fsPromise.readFile(path.resolve(`dumps/${fileName}`))
    return content.toString()
  } catch (e) {
    console.error('Failed to read dump to file: ', e)
  }
}

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

const _createTmpFileName = (table: string): string =>
  `${TMP_FOLDER}/${table}_primaries.tmp`

export {
  writeDumb,
  readDump,
  openPrimaryStream,
  readPrimaries,
  cleanUpTmpFiles
}
