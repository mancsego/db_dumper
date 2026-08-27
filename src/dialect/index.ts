import { IDialect } from '#src/dialect/IDialect'
import { MysqlDialect } from '#src/dialect/MysqlDialect'
import { PostgresDialect } from '#src/dialect/PostgresDialect'

let dialectCache: IDialect | null = null

const DIALECT_MAP = {
  mysql: MysqlDialect,
  postgres: PostgresDialect,
  postgresql: PostgresDialect
}

/**
 * Returns the dialect instance corresponding to the DB_DIALECT env var.
 * Defaults to 'mysql' for backwards compatibility.
 * The instance is cached for the lifetime of the process.
 */
const getDialect = (): IDialect => {
  if (dialectCache) return dialectCache

  const selected = (process.env.DB_DIALECT ?? 'mysql').toLowerCase()
  const dialect =
    DIALECT_MAP[selected as keyof typeof DIALECT_MAP] || MysqlDialect

  dialectCache = new dialect()

  return dialectCache
}

/**
 * Resets the cached dialect instance. Useful for testing.
 */
const resetDialect = (): void => {
  dialectCache = null
}

export { getDialect, resetDialect }
