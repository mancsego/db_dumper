import { config } from 'dotenv'
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

const createDataStatements = async (definition: ImportDefinition) => {
  const dumb = dumpStream.open()
  const { connection } = await getConnection()

  for (const config of definition) {
    if (config.type === ExportTypes.STRUCTURE_ONLY) continue

    const query = _createQuery(config)

    saveHistory(config.table, query)
    const [rows] = await connection.query<RowDataPacket[]>(query)

    dumb.write(_createInsertStatements(config, rows))
  }

  dumpStream.close()
}

const _createInsertStatements = (
  config: ConfigObject,
  rows: RowDataPacket[]
) => {
  const values = rows.reduce(_valueReducer(config), '').slice(0, -1)

  return `INSERT INTO ${config.table} VALUES ${values};  `
}

const _valueReducer =
  (config: ConfigObject) => (values: string, next: Record<string, unknown>) => {
    const row = Object.keys(next)
      .reduce((collected: string, column: string) => {
        return `${collected}${_getValue(config.columns, column, next[column])}, `
      }, '')
      .slice(0, -2)

    return `${values} (${row}),`
  }

const STRINGIFY = ['object', 'string']
const shouldStringify = (x: unknown) =>
  x !== 'DEFAULT' && STRINGIFY.includes(typeof x)

const _getValue = (
  columns: Record<string, CallableFunction> | undefined,
  key: string,
  value: unknown
) => {
  const filter = _getFilterMethod(columns, key)
  const res = filter(value)

  return shouldStringify(res) ? `"${res}"` : res
}

const _getFilterMethod = (
  columnConfig: Record<string, CallableFunction> | undefined,
  column: string
) => (columnConfig ?? {})[column] ?? ((v: unknown) => v)

const _createJoin = (config: ConfigObject) => {
  if (!config.dependencies) return ''

  return config.dependencies.reduce(
    (wherePart, { table, column }) =>
      `${wherePart} ${getJoinForDependency(config.table, table, column)}`,
    ' '
  )
}

const _createQuery = (config: ConfigObject) => {
  const from = ` FROM ${config.table}`
  const join = _createJoin(config)
  const where = _createWhere(config)
  const limit = _createLimit(config)

  return `SELECT *${from}${join}${where}${limit};`
}

const _createLimit = (config: ConfigObject) =>
  config.limit ? `LIMIT ${config.limit}` : ''

const _createWhere = (config: ConfigObject) => {
  if (!config.where) return ' '

  return config.where
    .reduce((where, condition) => `${where} ${condition} OR`, ' WHERE')
    .slice(0, -2)
}

export { createDataStatements }
