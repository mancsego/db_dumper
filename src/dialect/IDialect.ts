import { ConfigObject, ImportDefinition } from '#src/exporter/config/types'

interface IDialect {
  readonly name: 'mysql' | 'postgres'

  // Connection lifecycle
  getConnection(): Promise<void>
  closeConnection(): Promise<void>
  query<T>(sql: string): Promise<T[]>

  // DDL & Constraint Headers/Footers
  getHeaderStatements(): string
  getFooterStatements(definition: ImportDefinition): Promise<string>
  getTableDDL(tableName: string): Promise<string>

  // Identifier & Literal Formatting
  quoteIdentifier(identifier: string): string
  escapeString(value: string): string
  formatValue(value: unknown, columnName?: string, tableName?: string): string

  // Joins & Selects
  buildSelectQuery(
    config: ConfigObject,
    joins: string,
    where: string,
    limit: string
  ): string
  buildJoinSubquery(
    parentTable: string,
    parentCol: string,
    childTable: string,
    childCol: string,
    subSelect: string
  ): string
}

export { IDialect }
