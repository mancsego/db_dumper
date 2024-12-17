import { RowDataPacket } from 'mysql2'
import {
  ImportDefinition,
  ExportTypes,
  ConfigObject
} from '#src/exporter/config/types'
import { getConnection } from '#src/exporter/db'
import {
  dumpStream,
  openPrimaryStream,
  readPrimaries
} from '#src/exporter/FileService'

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

    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT * FROM ${config.table} ${await _createWhere(definition, config)}`
    )

    dumb.write(_createInsertStatements(config, rows))
  }

  dumpStream.close()
}

const _createInsertStatements = (
  config: ConfigObject,
  rows: RowDataPacket[]
) => {
  const stream = openPrimaryStream(config.table)
  const savePrimary = (next: Record<string, unknown>) => {
    stream.save(next[config.primary])
  }

  const values = rows
    .reduce(_valueReducer(config, savePrimary), '')
    .slice(0, -1)

  const statement = `INSERT INTO ${config.table} VALUES${values};\n`
  stream.close()

  return statement
}

const _valueReducer =
  (config: ConfigObject, clb: CallableFunction) =>
  (values: string, next: Record<string, unknown>) => {
    clb(next)

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
  definition: ImportDefinition,
  config: ConfigObject
) => {
  if (!config.dependencies) return ''

  const primaries = readPrimaries(config)

  const where = config.dependencies.reduce((wherePart, dependency) => {
    const keys = primaries[dependency]
    if (!keys.length) return wherePart
    const { primary } = definition.find(
      ({ table }) => table === dependency
    ) as ConfigObject

    return `${wherePart} ${primary} IN (${keys}) AND`
  }, 'WHERE')

  return where.slice(0, -4)
}

export { createTableStatements, createDataStatements }
