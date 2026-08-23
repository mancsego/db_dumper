import { ImportDefinition } from '#src/exporter/config/types'
import { dumpStream } from '#src/service/FileService'
import { getConnection } from '#src/exporter/db'
import { RowDataPacket } from 'mysql2'

const createTableStatements = async (definition: ImportDefinition) => {
  dumpStream.open()
  const { connection } = await getConnection()

  await dumpStream.write(
    '-- --------------------------------------------------------\n' +
    '-- DB Dumper SQL Export\n' +
    '-- --------------------------------------------------------\n\n' +
    'SET FOREIGN_KEY_CHECKS = 0;\n\n'
  )

  for (const { table } of definition) {
    const [rows] = await connection.query<RowDataPacket[]>(
      `SHOW CREATE TABLE \`${table}\``
    )

    if (rows && rows.length > 0) {
      const row = rows[0] as Record<string, string>
      const createTableSql =
        row['Create Table'] ?? row['Create View'] ?? Object.values(row)[1]

      await dumpStream.write(`DROP TABLE IF EXISTS \`${table}\`;\n`)
      await dumpStream.write(`${createTableSql};\n\n`)
    }
  }
}

export { createTableStatements }
