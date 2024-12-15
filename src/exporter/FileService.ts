import fs from 'fs'
import fsPromise from 'fs/promises'
import path from 'path'

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
  const fileName = `${TMP_FOLDER}/${table}_primaries.tmp`
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

const cleanUpTmpFiles = (): void => {
  fs.readdir(TMP_FOLDER, (_, tmpFiles) => {
    console.log(tmpFiles)

    tmpFiles.forEach((file) => {
      const filePath = path.join(TMP_FOLDER, file)

      console.log(filePath)

      if (!file.endsWith('.tmp')) return

      fs.unlink(filePath, () => {})
    })
  })
}

export { writeDumb, readDump, openPrimaryStream, cleanUpTmpFiles }
