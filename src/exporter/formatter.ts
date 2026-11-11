import { TypeCastField } from 'mysql2'
import { ColumnConfig } from './config/types'
import { loadConfiguration } from './config/configLoader'

const createTypeCaster = async () => {
  const tableConfigs = await _collectConfigPerTable()

  return (
    { table, name, type, buffer }: TypeCastField,
    next: () => unknown
  ) => {
    const rawValue = next()
    const columnTransformer = tableConfigs[table]?.[name]

    if (columnTransformer) {
      const transformed = columnTransformer(rawValue)
      return _formatValue(transformed)
    }

    if (type === 'BIT') {
      return buffer()?.readUInt8(0) ?? 0
    }

    if (rawValue === null || rawValue === undefined) {
      return 'NULL'
    }

    switch (type) {
      case 'VAR_STRING':
      case 'STRING':
        return _formatVarString(String(rawValue))
      case 'TIMESTAMP':
      case 'DATETIME':
      case 'DATE':
      case 'NEWDATE':
        return _formatTimestamp(rawValue)
      case 'TINY':
      case 'SHORT':
      case 'LONG':
      case 'LONGLONG':
      case 'INT24':
      case 'FLOAT':
      case 'DOUBLE':
      case 'DECIMAL':
      case 'NEWDECIMAL':
        return typeof rawValue === 'number' ? rawValue : Number(rawValue)
      default:
        return _formatValue(rawValue)
    }
  }
}

const _collectConfigPerTable = async (): Promise<
  Record<string, ColumnConfig>
> => {
  const def = await loadConfiguration()
  return def.reduce(
    (cur, { table, columns }) => ({
      ...cur,
      [table]: columns ?? {}
    }),
    {}
  )
}

const _formatValue = (value: unknown): unknown => {
  if (value === 'DEFAULT') return 'DEFAULT'
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'number') return isNaN(value) ? 'NULL' : value
  if (typeof value === 'boolean') return value ? 1 : 0
  if (value instanceof Date) return _formatTimestamp(value)

  return _escapeSqlString(String(value))
}

const _escapeSqlString = (val: string): string => {
  const escaped = val
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\0/g, '\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    // eslint-disable-next-line no-control-regex
    .replace(/\x1a/g, '\\Z')

  return `'${escaped}'`
}

const _formatVarString = (statement: string): string => {
  if (!statement) return "''"
  if (statement === '0000-00-00 00:00:00') return 'CURRENT_TIMESTAMP'
  if (statement.includes('CREATE TABLE')) return statement

  return _escapeSqlString(statement)
}

const _formatTimestamp = (date: unknown): string => {
  if (!date) return 'NULL'

  const d = date instanceof Date ? date : new Date(String(date))
  if (isNaN(d.getTime())) return 'NULL'

  const iso = d.toISOString().slice(0, 19).replace('T', ' ')
  return `'${iso}'`
}

export default createTypeCaster
