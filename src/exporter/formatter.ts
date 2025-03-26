import { TypeCastField } from 'mysql2'
import { ColumnConfig } from './config/types'
import { loadConfiguration } from './config/configLoader'

const createTypeCaster = async () => {
  const tableConfigs = await _collectConfigPerTable()

  return (field: TypeCastField, next: () => unknown) => {
    const value = next() as string

    if (field.type === 'BIT') return field.buffer()?.readUInt8(0) ?? 0

    switch (field.type) {
      case 'VAR_STRING':
        return _formatVarString(value)
      case 'TIMESTAMP':
        return _formatTimestamp(value)
      default:
        return _getValue(tableConfigs, field.name, value)
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
      [table]: columns
    }),
    {}
  )
}

const _getValue = (
  config: Record<string, ColumnConfig>,
  table: string,
  value: unknown
) => {
  const filter = _getFilterMethod(config[table], table)
  const res = filter(value)

  return _shouldStringify(res) ? `"${res}"` : res
}

const _getFilterMethod = (
  columnConfig: Record<string, CallableFunction> | undefined,
  column: string
) => (columnConfig ?? {})[column] ?? ((v: unknown) => v)

const _shouldStringify = (x: unknown) =>
  x !== 'DEFAULT' && x !== null && ['object', 'string'].includes(typeof x)

const _formatVarString = (statement: string): string => {
  const value =
    statement?.replace(/'0000-00-00 00:00:00'/g, 'CURRENT_TIMESTAMP') ?? ''

  return value.includes('CREATE TABLE') ? value : `'${value}'`
}

const _formatTimestamp = (date: string) => {
  if (!date) return null

  const d = new Date(date)
  if (isNaN(d.getTime())) return null

  return `'${d.toISOString().slice(0, 19).replace('T', ' ')}'`
}

export default createTypeCaster
