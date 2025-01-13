enum ExportTypes {
  STRUCTURE_ONLY,
  DATA
}

type Dependency = {
  table: string
  column: string
}

type ConfigObject = {
  table: string
  type: ExportTypes
  limit?: number
  where?: Array<string>
  columns?: ColumnConfig
  dependencies?: Array<Dependency>
}

type ColumnConfig = Record<string, CallableFunction>

type ImportDefinition = Array<ConfigObject>

export { ExportTypes, ConfigObject, ImportDefinition, ColumnConfig }
