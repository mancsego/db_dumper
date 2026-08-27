import {
  ConfigObject,
  ExportTypes,
  ImportDefinition
} from '#src/exporter/config/types'
import { getDialect } from '#src/dialect/index'
import { dumpStream } from '#src/service/FileService'
import {
  getJoinForDependency,
  saveHistory
} from '#src/exporter/DependencyDescriptor'
import { collectConfigPerTable } from '#src/exporter/formatter'
import { IDialect } from '#src/dialect/IDialect'
import { MysqlDialect } from '#src/dialect/MysqlDialect'
import { PostgresDialect } from '#src/dialect/PostgresDialect'

const BATCH_SIZE = 500

const createDataStatements = async (definition: ImportDefinition) => {
  dumpStream.open()
  const dialect = getDialect()
  await dialect.getConnection()

  // Provide transformer configs to dialect for per-column value formatting
  const tableColumnsConfig = await collectConfigPerTable()
  if (dialect instanceof MysqlDialect || dialect instanceof PostgresDialect) {
    dialect.setColumnsConfig(tableColumnsConfig)
  }

  for (const config of definition) {
    if (config.type === ExportTypes.STRUCTURE_ONLY) continue

    const query = _createQuery(dialect, config).trim()
    saveHistory(config.table, query)

    const rows = await dialect.query<Record<string, unknown>>(query)
    if (!rows || rows.length === 0) continue

    await _writeBatchedInserts(dialect, config, rows)
  }
}

const _writeBatchedInserts = async (
  dialect: IDialect,
  config: ConfigObject,
  rows: Record<string, unknown>[]
) => {
  const quotedTable = dialect.quoteIdentifier(config.table)

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE)
    const insertSql = _createInsertChunk(dialect, quotedTable, config, chunk)
    await dumpStream.write(insertSql)
  }
  await dumpStream.write('\n')
}

const _createInsertChunk = (
  dialect: IDialect,
  quotedTable: string,
  config: ConfigObject,
  rows: Record<string, unknown>[]
): string => {
  const firstRow = rows[0]
  const columns = Object.keys(firstRow)
  const quotedColumns = columns
    .map((col) => dialect.quoteIdentifier(col))
    .join(', ')

  const valuesStr = rows
    .reduce(
      (acc: string, row: Record<string, unknown>) =>
        `${acc} (${_buildRowValues(dialect, config.table, columns, row)}),`,
      ''
    )
    .slice(0, -1)

  return `INSERT INTO ${quotedTable} (${quotedColumns}) VALUES${valuesStr};\n`
}

const _buildRowValues = (
  dialect: IDialect,
  tableName: string,
  columns: string[],
  row: Record<string, unknown>
): string => {
  return columns
    .map((col) => dialect.formatValue(row[col], col, tableName))
    .join(', ')
}

const _createJoin = (dialect: IDialect, config: ConfigObject): string => {
  if (!config.dependencies || config.dependencies.length === 0) return ''

  const joins = config.dependencies
    .map((dep) => {
      const parentCol = dep.parentColumn ?? dep.column ?? ''
      const foreignCol = dep.foreignColumn ?? dep.column ?? parentCol
      return getJoinForDependency(
        dialect,
        config.table,
        dep.table,
        parentCol,
        foreignCol
      )
    })
    .filter((j) => Boolean(j && j.trim().length > 0))

  return joins.length > 0 ? ` ${joins.join(' ')}` : ''
}

const _createQuery = (dialect: IDialect, config: ConfigObject): string => {
  const joins = _createJoin(dialect, config)
  const where = _createWhere(config)
  const limit = _createLimit(config)

  return dialect.buildSelectQuery(config, joins, where, limit)
}

const _createLimit = (config: ConfigObject): string =>
  config.limit ? ` LIMIT ${config.limit}` : ''

const _createWhere = (config: ConfigObject): string => {
  if (!config.where || config.where.length === 0) return ''

  return config.where.reduce(
    (where, { connector, condition }, i) =>
      !i ? `${where}${condition}` : `${where} ${connector} ${condition}`,
    ' WHERE '
  )
}

export { createDataStatements }
