enum ExportTypes {
  STRUCTURE_ONLY,
  DATA,
  FILTER
}

type Dependency = {
  table: string,
  column: string,
}

type ConfigObject = {
  table: string
  type: ExportTypes
  limit?: number,
  columns?: ColumnConfig
  dependencies?: Array<Dependency>
}

type ColumnConfig = Record<string, CallableFunction>

type ImportDefinition = Array<ConfigObject>

export { ExportTypes, ConfigObject, ImportDefinition, ColumnConfig }
