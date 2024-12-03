import fs from 'fs/promises'
import path from 'path'

const writeDumb = async (fileName: string, ...content: string[]) => {
  const fileContent = content.join('')

  try {
    await fs.writeFile(path.resolve(`dumps/${fileName}`), fileContent)
  } catch (e) {
    console.error('Failed to write dump to file: ', e)
  }
}

const readDump = async (fileName: string) => {
  try {
    const content = await fs.readFile(path.resolve(`dumps/${fileName}`))
    return content.toString()
  } catch (e) {
    console.error('Failed to read dump to file: ', e)
  }
}

export { writeDumb, readDump }
