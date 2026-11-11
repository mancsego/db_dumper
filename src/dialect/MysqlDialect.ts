import { config } from 'dotenv'
import mysql, { Connection } from 'mysql2'
import { Connection as PromiseConnection, RowDataPacket } from 'mysql2/promise'
import { ConfigObject, ImportDefinition } from '#src/exporter/config/types'
import { IDialect } from '#src/dialect/IDialect'
import {
  applyTransformer,
  formatValue,
  formatTimestamp
} from '#src/exporter/formatter'

const { parsed: env } = config()

type DatabaseConnection = {
  db: Connection
  connection: PromiseConnection
}

class MysqlDialect implements IDialect {
  readonly name = 'mysql' as const

  private cache: DatabaseConnection | null = null

  // Loads the columnConfig per table for transformation use in formatValue
  private tableColumnsConfig: Record<string, Record<string, CallableFunction>> =
    {}

  setColumnsConfig(
    cfg: Record<string, Record<string, CallableFunction>>
  ): void {
    this.tableColumnsConfig = cfg
  }

  async getConnection(): Promise<void> {
    if (this.cache) return

    const db = mysql.createConnection({
      host: process.env.HOST ?? env?.HOST ?? '127.0.0.1',
      user: process.env.DB_USER ?? env?.DB_USER ?? 'root',
      password: process.env.DB_PASSWORD ?? env?.DB_PASSWORD ?? 'root',
      database: process.env.TARGET_DB ?? env?.TARGET_DB ?? 'db',
      port: Number(process.env.DB_PORT ?? env?.DB_PORT ?? 3306)
    })

    const connection = db.promise()
    this.cache = { db, connection }
  }

  async closeConnection(): Promise<void> {
    if (this.cache) {
      try {
        await this.cache.connection.end()
      } catch {
        this.cache.db.destroy()
      } finally {
        this.cache = null
      }
    }
  }

  async query<T>(sql: string): Promise<T[]> {
    await this.getConnection()
    const [rows] = await this.cache!.connection.query<RowDataPacket[]>(sql)
    return rows as T[]
  }

  getHeaderStatements(): string {
    return (
      '-- --------------------------------------------------------\n' +
      '-- DB Dumper SQL Export\n' +
      '-- --------------------------------------------------------\n\n' +
      'SET FOREIGN_KEY_CHECKS = 0;\n\n'
    )
  }

  async getFooterStatements(_definition: ImportDefinition): Promise<string> {
    return 'SET FOREIGN_KEY_CHECKS = 1;\n'
  }

  async getTableDDL(tableName: string): Promise<string> {
    const rows = await this.query<Record<string, string>>(
      `SHOW CREATE TABLE \`${tableName}\``
    )

    if (!rows || rows.length === 0) return ''

    const row = rows[0]
    const createTableSql =
      row['Create Table'] ?? row['Create View'] ?? Object.values(row)[1]

    return `DROP TABLE IF EXISTS \`${tableName}\`;\n` + `${createTableSql};\n\n`
  }

  quoteIdentifier(identifier: string): string {
    return `\`${identifier}\``
  }

  escapeString(value: string): string {
    const escaped = value
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\0/g, '\\0')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      // eslint-disable-next-line no-control-regex
      .replace(/\x1a/g, '\\Z')

    return `'${escaped}'`
  }

  formatValue(value: unknown, columnName?: string, tableName?: string): string {
    const transformer =
      tableName && columnName
        ? this.tableColumnsConfig[tableName]?.[columnName]
        : undefined

    if (transformer) {
      return String(applyTransformer(transformer, value))
    }

    return String(formatValue(value))
  }

  buildSelectQuery(
    config: ConfigObject,
    joins: string,
    where: string,
    limit: string
  ): string {
    const from = ` FROM \`${config.table}\``
    return `SELECT *${from}${joins}${where}${limit};`
  }

  buildJoinSubquery(
    parentTable: string,
    parentCol: string,
    childTable: string,
    _childCol: string,
    subSelect: string
  ): string {
    const subTableAlias = `sub_${parentTable}`
    return (
      `INNER JOIN (${subSelect}) AS \`${subTableAlias}\`` +
      ` ON \`${subTableAlias}\`.\`${parentCol}\` = \`${childTable}\`.\`${_childCol}\``
    )
  }

  formatTimestamp(date: unknown): string {
    return formatTimestamp(date)
  }
}

export { MysqlDialect }
