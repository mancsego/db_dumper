import { RowDataPacket } from 'mysql2'
import {
  ImportDefinition,
  ExportTypes,
  ConfigObject
} from '#src/exporter/config/types'
import { getConnection } from '#src/exporter/db'
import { openPrimaryStream, readPrimaries } from '#src/exporter/FileService'

const stringify = ['object', 'string']
const shouldStringify = (x: unknown) => stringify.includes(x as string)

const createTableStatements = async (definition: ImportDefinition) => {
  const { connection } = await getConnection()

  const results = await Promise.all(
    definition.map(async ({ table }) => {
      const [rows] = await connection.query<RowDataPacket[]>(
        `SHOW CREATE TABLE ${table}`
      )
      return rows
    })
  )

  return results.reduce(
    (collected: string, next: RowDataPacket[]) =>
      `${collected}${next[0]['Create Table']};`,
    ''
  )
}

const createDataStatements = async (definition: ImportDefinition) => {
  const { connection } = await getConnection()

  let statements = ''
  for (const config of definition) {
    if (config.type === ExportTypes.STRUCTURE_ONLY) continue

    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT * FROM ${config.table} ${await _createWhere(definition, config)}`
    )
    console.log(
      `SELECT * FROM ${config.table} ${await _createWhere(definition, config)}`
    )

    statements += _createInsertStatements(config, rows)
  }

  return statements
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

  const statement = `INSERT INTO ${config.table} VALUES${values};\n\n`
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

  return shouldStringify(typeof v) ? `"${res}"` : res
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
