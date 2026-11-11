import { RowDataPacket } from 'mysql2'
import {
  ConfigObject,
  ExportTypes,
  ImportDefinition
} from '#src/exporter/config/types'
import { getConnection } from '#src/exporter/db'
import { dumpStream } from '#src/service/FileService'
import {
  getJoinForDependency,
  saveHistory
} from '#src/exporter/DependencyDescriptor'

const BATCH_SIZE = 500

const createDataStatements = async (definition: ImportDefinition) => {
  dumpStream.open()
  const { connection } = await getConnection()

  for (const config of definition) {
    if (config.type === ExportTypes.STRUCTURE_ONLY) continue

    const query = _createQuery(config).trim()

    saveHistory(config.table, query)
    const [rows] = await connection.query<RowDataPacket[]>(query)

    if (!rows || rows.length === 0) continue

    await _writeBatchedInserts(config, rows)
  }
}

const _writeBatchedInserts = async (
  config: ConfigObject,
  rows: RowDataPacket[]
) => {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE)
    const insertSql = _createInsertChunk(config, chunk)
    await dumpStream.write(insertSql)
  }
  await dumpStream.write('\n')
}

const _createInsertChunk = (config: ConfigObject, rows: RowDataPacket[]) => {
  const valuesStr = rows.reduce(_valueReducer, '').slice(0, -1)
  return `INSERT INTO \`${config.table}\` VALUES ${valuesStr};\n`
}

const _valueReducer = (values: string, next: Record<string, unknown>) => {
  const row = Object.keys(next)
    .reduce((collected: string, column: string) => {
      const val = next[column]
      return `${collected}${val}, `
    }, '')
    .slice(0, -2)

  return `${values} (${row}),`
}

const _createJoin = (config: ConfigObject) => {
  if (!config.dependencies || config.dependencies.length === 0) return ''

  const joins = config.dependencies
    .map((dep) => {
      const parentCol = dep.parentColumn ?? dep.column ?? ''
      const foreignCol = dep.foreignColumn ?? dep.column ?? parentCol
      return getJoinForDependency(
        config.table,
        dep.table,
        parentCol,
        foreignCol
      )
    })
    .filter((j) => Boolean(j && j.trim().length > 0))

  return joins.length > 0 ? ` ${joins.join(' ')}` : ''
}

const _createQuery = (config: ConfigObject) => {
  const from = ` FROM \`${config.table}\``
  const join = _createJoin(config)
  const where = _createWhere(config)
  const limit = _createLimit(config)

  return `SELECT *${from}${join}${where}${limit};`
}

const _createLimit = (config: ConfigObject) =>
  config.limit ? ` LIMIT ${config.limit}` : ''

const _createWhere = (config: ConfigObject) => {
  if (!config.where || config.where.length === 0) return ''

  return config.where.reduce(
    (where, { connector, condition }, i) =>
      !i ? `${where}${condition}` : `${where} ${connector} ${condition}`,
    ' WHERE '
  )
}

export { createDataStatements }
