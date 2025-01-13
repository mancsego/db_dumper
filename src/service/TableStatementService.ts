import { ImportDefinition } from '#src/exporter/config/types'
import { dumpStream } from '#src/service/FileService'
import { getConnection } from '#src/exporter/db'
import { RowDataPacket } from 'mysql2'

const createTableStatements = async (definition: ImportDefinition) => {
  const dumb = dumpStream.open()
  const { connection } = await getConnection()

  for (const { table } of definition) {
    const [[{ 'Create Table': createTable }]] = await connection.query<
      RowDataPacket[]
    >(`SHOW CREATE TABLE ${table}`)

    dumb.write(createTable + ';\n')
  }

  dumpStream.close()
}

export { createTableStatements }
