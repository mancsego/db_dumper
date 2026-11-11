import { ImportDefinition } from '#src/exporter/config/types'
import { dumpStream } from '#src/service/FileService'
import { getDialect } from '#src/dialect/index'

const createTableStatements = async (definition: ImportDefinition) => {
  dumpStream.open()
  const dialect = getDialect()
  await dialect.getConnection()

  await dumpStream.write(dialect.getHeaderStatements())

  for (const { table } of definition) {
    const ddl = await dialect.getTableDDL(table)
    if (ddl) {
      await dumpStream.write(ddl)
    }
  }
}

export { createTableStatements }
