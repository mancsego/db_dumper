import { ColumnConfig } from './config/types'
import { loadConfiguration } from './config/configLoader'

/**
 * Applies a column transformer function to a raw value and formats the result
 * as a SQL literal string.
 */
const applyTransformer = (
  transformer: CallableFunction,
  rawValue: unknown
): unknown => {
  const transformed = transformer(rawValue)
  return formatValue(transformed)
}

/**
 * Collects column transformer configurations grouped by table name.
 * Used by dialect implementations to resolve transformers during row formatting.
 */
const collectConfigPerTable = async (): Promise<
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

/**
 * Formats any raw value into a SQL literal string.
 * Returns 'DEFAULT', 'NULL', a number, or a single-quoted escaped string.
 */
const formatValue = (value: unknown): unknown => {
  if (value === 'DEFAULT') return 'DEFAULT'
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'number') return isNaN(value) ? 'NULL' : value
  if (typeof value === 'boolean') return value ? 1 : 0
  if (value instanceof Date) return formatTimestamp(value)

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

/**
 * Formats a Date (or date-like) value into an ISO SQL timestamp string.
 */
const formatTimestamp = (date: unknown): string => {
  if (!date) return 'NULL'

  const d = date instanceof Date ? date : new Date(String(date))
  if (isNaN(d.getTime())) return 'NULL'

  const iso = d.toISOString().slice(0, 19).replace('T', ' ')
  return `'${iso}'`
}

export {
  applyTransformer,
  collectConfigPerTable,
  formatValue,
  formatTimestamp,
  _formatVarString
}
