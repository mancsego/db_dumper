enum ExportTypes {
  STRUCTURE_ONLY,
  DATA
}

enum Connector {
  AND = 'AND',
  OR = 'OR',
  IN = 'IN'
}

type Where = {
  condition: string
  connector: Connector
}

type Dependency = {
  table: string
  column: string
}

type ConfigObject = {
  table: string
  type: ExportTypes
  limit?: number
  where?: Array<Where>
  columns?: ColumnConfig
  dependencies?: Array<Dependency>
}

type ColumnConfig = Record<string, CallableFunction>

type ImportDefinition = Array<ConfigObject>

export { ExportTypes, ConfigObject, ImportDefinition, ColumnConfig, Connector }
