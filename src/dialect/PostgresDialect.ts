import { config } from 'dotenv'
import { Pool, PoolClient } from 'pg'
import { ConfigObject, ImportDefinition } from '#src/exporter/config/types'
import { IDialect } from '#src/dialect/IDialect'
import { applyTransformer, formatTimestamp } from '#src/exporter/formatter'

const { parsed: env } = config()

interface PgColumnInfo {
  column_name: string
  data_type: string
  character_maximum_length: number | null
  numeric_precision: number | null
  numeric_scale: number | null
  column_default: string | null
  is_nullable: string
  is_identity: string
  is_serial: boolean
}

interface PgConstraintInfo {
  constraint_name: string
  constraint_type: string
  column_names: string[]
  foreign_table: string | null
  foreign_columns: string[] | null
  on_delete: string | null
  on_update: string | null
}

class PostgresDialect implements IDialect {
  readonly name = 'postgres' as const

  private pool: Pool | null = null
  private client: PoolClient | null = null

  private tableColumnsConfig: Record<string, Record<string, CallableFunction>> =
    {}

  setColumnsConfig(
    cfg: Record<string, Record<string, CallableFunction>>
  ): void {
    this.tableColumnsConfig = cfg
  }

  async getConnection(): Promise<void> {
    if (this.pool) return

    this.pool = new Pool({
      host: process.env.HOST ?? env?.HOST ?? '127.0.0.1',
      user: process.env.DB_USER ?? env?.DB_USER ?? 'postgres',
      password: process.env.DB_PASSWORD ?? env?.DB_PASSWORD ?? 'postgres',
      database: process.env.TARGET_DB ?? env?.TARGET_DB ?? 'db',
      port: Number(process.env.DB_PORT ?? env?.DB_PORT ?? 5432)
    })

    this.client = await this.pool.connect()
  }

  async closeConnection(): Promise<void> {
    if (this.client) {
      this.client.release()
      this.client = null
    }
    if (this.pool) {
      await this.pool.end()
      this.pool = null
    }
  }

  async query<T>(sql: string): Promise<T[]> {
    await this.getConnection()
    const result = await this.client!.query(sql)
    return result.rows as T[]
  }

  getHeaderStatements(): string {
    return (
      '-- --------------------------------------------------------\n' +
      '-- DB Dumper SQL Export\n' +
      '-- --------------------------------------------------------\n\n' +
      "SET session_replication_role = 'replica';\n\n"
    )
  }

  async getFooterStatements(definition: ImportDefinition): Promise<string> {
    let footer = "SET session_replication_role = 'origin';\n"

    // Append sequence synchronization for all data-exporting tables
    for (const { table } of definition) {
      const seqResets = await this._getSequenceResets(table)
      footer += seqResets
    }

    return footer
  }

  /**
   * Queries pg_catalog to find serial/identity columns for a table and
   * generates setval() calls to keep sequences in sync after import.
   */
  private async _getSequenceResets(tableName: string): Promise<string> {
    const rows = await this.query<{ column_name: string }>(`
      SELECT a.attname AS column_name
      FROM pg_catalog.pg_attribute a
      JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
      WHERE c.relname = '${tableName}'
        AND n.nspname = 'public'
        AND a.attnum > 0
        AND NOT a.attisdropped
        AND (
          pg_get_expr(d.adbin, d.adrelid) LIKE 'nextval%'
          OR a.attidentity != ''
        )
    `)

    return rows
      .map(
        ({ column_name }) =>
          `SELECT setval(pg_get_serial_sequence('"${tableName}"', '${column_name}'), ` +
          `COALESCE(MAX("${column_name}"), 1), MAX("${column_name}") IS NOT NULL) FROM "${tableName}";\n`
      )
      .join('')
  }

  async getTableDDL(tableName: string): Promise<string> {
    const columns = await this._getColumns(tableName)
    if (!columns || columns.length === 0) return ''

    const constraints = await this._getConstraints(tableName)
    const columnDefs = columns.map((col) => this._buildColumnDef(col))
    const constraintDefs = this._buildConstraintDefs(constraints, tableName)

    const allDefs = [...columnDefs, ...constraintDefs]

    return (
      `DROP TABLE IF EXISTS "${tableName}" CASCADE;\n` +
      `CREATE TABLE "${tableName}" (\n  ${allDefs.join(',\n  ')}\n);\n\n`
    )
  }

  /**
   * Introspects column definitions from information_schema and pg_catalog.
   */
  private async _getColumns(tableName: string): Promise<PgColumnInfo[]> {
    return this.query<PgColumnInfo>(`
      SELECT
        c.column_name,
        c.data_type,
        c.character_maximum_length,
        c.numeric_precision,
        c.numeric_scale,
        c.column_default,
        c.is_nullable,
        c.is_identity,
        (c.column_default LIKE 'nextval%') AS is_serial
      FROM information_schema.columns c
      WHERE c.table_name = '${tableName}'
        AND c.table_schema = 'public'
      ORDER BY c.ordinal_position
    `)
  }

  /**
   * Introspects constraints (PK, UNIQUE, FK) from information_schema and pg_catalog.
   */
  private async _getConstraints(
    tableName: string
  ): Promise<PgConstraintInfo[]> {
    const rows = await this.query<{
      constraint_name: string
      constraint_type: string
      column_name: string
      foreign_table_name: string | null
      foreign_column_name: string | null
      delete_rule: string | null
      update_rule: string | null
    }>(`
      SELECT
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule,
        rc.update_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      LEFT JOIN information_schema.referential_constraints rc
        ON tc.constraint_name = rc.constraint_name
      LEFT JOIN information_schema.constraint_column_usage ccu
        ON rc.unique_constraint_name = ccu.constraint_name
        AND rc.unique_constraint_schema = ccu.constraint_schema
      WHERE tc.table_name = '${tableName}'
        AND tc.table_schema = 'public'
      ORDER BY tc.constraint_type, tc.constraint_name, kcu.ordinal_position
    `)

    // Group columns per constraint
    const grouped = new Map<string, PgConstraintInfo>()
    for (const row of rows) {
      if (!grouped.has(row.constraint_name)) {
        grouped.set(row.constraint_name, {
          constraint_name: row.constraint_name,
          constraint_type: row.constraint_type,
          column_names: [],
          foreign_table: row.foreign_table_name,
          foreign_columns: row.foreign_table_name ? [] : null,
          on_delete: row.delete_rule,
          on_update: row.update_rule
        })
      }
      const entry = grouped.get(row.constraint_name)!
      entry.column_names.push(row.column_name)
      if (row.foreign_column_name && entry.foreign_columns) {
        entry.foreign_columns.push(row.foreign_column_name)
      }
    }

    return Array.from(grouped.values())
  }

  /**
   * Converts a PgColumnInfo row into a SQL column definition string.
   */
  private _buildColumnDef(col: PgColumnInfo): string {
    const type = this._resolveDataType(col)

    // Use SERIAL / BIGSERIAL shorthands for auto-increment columns
    if (col.is_serial) {
      if (type === 'integer') return `"${col.column_name}" SERIAL`
      if (type === 'bigint') return `"${col.column_name}" BIGSERIAL`
    }

    if (col.is_identity === 'YES') {
      return `"${col.column_name}" ${type.toUpperCase()} GENERATED ALWAYS AS IDENTITY`
    }

    let def = `"${col.column_name}" ${type.toUpperCase()}`

    if (col.is_nullable === 'NO') def += ' NOT NULL'

    if (col.column_default !== null && !col.is_serial) {
      def += ` DEFAULT ${col.column_default}`
    }

    return def
  }

  private _resolveDataType(col: PgColumnInfo): string {
    const {
      data_type,
      character_maximum_length,
      numeric_precision,
      numeric_scale
    } = col

    switch (data_type) {
      case 'character varying':
        return character_maximum_length
          ? `VARCHAR(${character_maximum_length})`
          : 'TEXT'
      case 'character':
        return character_maximum_length
          ? `CHAR(${character_maximum_length})`
          : 'CHAR'
      case 'numeric':
      case 'decimal':
        if (numeric_precision !== null && numeric_scale !== null) {
          return `NUMERIC(${numeric_precision}, ${numeric_scale})`
        }
        return 'NUMERIC'
      case 'timestamp without time zone':
        return 'TIMESTAMP'
      case 'timestamp with time zone':
        return 'TIMESTAMPTZ'
      case 'time without time zone':
        return 'TIME'
      case 'time with time zone':
        return 'TIMETZ'
      case 'double precision':
        return 'DOUBLE PRECISION'
      default:
        return data_type
    }
  }

  /**
   * Builds CONSTRAINT SQL for PRIMARY KEY, UNIQUE, and FOREIGN KEY constraints.
   */
  private _buildConstraintDefs(
    constraints: PgConstraintInfo[],
    _tableName: string
  ): string[] {
    const defs: string[] = []

    for (const c of constraints) {
      const cols = c.column_names.map((col) => `"${col}"`).join(', ')

      if (c.constraint_type === 'PRIMARY KEY') {
        defs.push(`CONSTRAINT "${c.constraint_name}" PRIMARY KEY (${cols})`)
      } else if (c.constraint_type === 'UNIQUE') {
        defs.push(`CONSTRAINT "${c.constraint_name}" UNIQUE (${cols})`)
      } else if (
        c.constraint_type === 'FOREIGN KEY' &&
        c.foreign_table &&
        c.foreign_columns &&
        c.foreign_columns.length > 0
      ) {
        const fkCols = c.foreign_columns.map((col) => `"${col}"`).join(', ')
        let fkDef =
          `CONSTRAINT "${c.constraint_name}" FOREIGN KEY (${cols})` +
          ` REFERENCES "${c.foreign_table}" (${fkCols})`
        if (c.on_delete) fkDef += ` ON DELETE ${c.on_delete}`
        if (c.on_update) fkDef += ` ON UPDATE ${c.on_update}`
        defs.push(fkDef)
      }
    }

    return defs
  }

  quoteIdentifier(identifier: string): string {
    return `"${identifier}"`
  }

  escapeString(value: string): string {
    // Standard SQL string escaping for PostgreSQL
    const escaped = value.replace(/'/g, "''")
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

    if (value === null || value === undefined) return 'NULL'
    if (value === 'DEFAULT') return 'DEFAULT'
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
    if (typeof value === 'number')
      return isNaN(value as number) ? 'NULL' : String(value)
    if (value instanceof Date) return formatTimestamp(value)
    if (value instanceof Buffer) return `'\\x${value.toString('hex')}'`

    return this.escapeString(String(value))
  }

  buildSelectQuery(
    config: ConfigObject,
    joins: string,
    where: string,
    limit: string
  ): string {
    const from = ` FROM "${config.table}"`
    return `SELECT *${from}${joins}${where}${limit};`
  }

  buildJoinSubquery(
    parentTable: string,
    parentCol: string,
    childTable: string,
    childCol: string,
    subSelect: string
  ): string {
    const subTableAlias = `sub_${parentTable}`
    return (
      `INNER JOIN (${subSelect}) AS "${subTableAlias}"` +
      ` ON "${subTableAlias}"."${parentCol}" = "${childTable}"."${childCol}"`
    )
  }
}

export { PostgresDialect }
