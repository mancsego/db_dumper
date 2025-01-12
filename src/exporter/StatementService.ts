import { RowDataPacket } from 'mysql2'
import {
  ImportDefinition,
  ExportTypes,
  ConfigObject
} from '#src/exporter/config/types'
import { getConnection } from '#src/exporter/db'
import { dumpStream } from '#src/exporter/FileService'
import { getWherePartForDependency, saveHistory } from '#src/exporter/DependencyDescriptor'

const stringify = ['object', 'string']
const shouldStringify = (x: unknown) =>
  x !== 'DEFAULT' && stringify.includes(typeof x)

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

const createDataStatements = async (definition: ImportDefinition) => {
  const dumb = dumpStream.open()
  const { connection } = await getConnection()

  for (const config of definition) {
    if (config.type === ExportTypes.STRUCTURE_ONLY) continue

    const query = `SELECT *
                   FROM ${config.table}
                   WHERE ${await _createWhere(config)}`

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

  const values = rows
    .reduce(_valueReducer(config), '')
    .slice(0, -1)

  const statement = `INSERT INTO ${config.table}
                     VALUES ${values};  `

  return statement
}

const _valueReducer =
  (config: ConfigObject) =>
    (values: string, next: Record<string, unknown>) => {
      const row = Object.keys(next)
        .reduce((collected: string, column: string) => {
          return `${collected}${_getValue(next[column], _getFilterMethod(config.columns, column))}, `
        }, '')
        .slice(0, -2)

      return `${values} (${row}),`
    }

const _getValue = (v: unknown, clb: CallableFunction) => {
  const res = clb(v)

  return shouldStringify(res) ? `"${res}"` : res
}

const _getFilterMethod = (
  columnConfig: Record<string, CallableFunction> | undefined,
  column: string
) => (columnConfig ?? {})[column] ?? ((v: unknown) => v)

const _createWhere = async (
  config: ConfigObject
) => {
  if (!config.dependencies) return '1 = 1;'

  const where = config.dependencies.reduce((wherePart, { table, column }) =>
      `${wherePart} ${getWherePartForDependency(table, column)} AND`,
    ''
  )

  return where.slice(0, -4)
}

export { createTableStatements, createDataStatements }
