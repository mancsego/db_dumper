enum ExportTypes {
  STRUCTURE_ONLY,
  DATA,
  FILTER
}

type ConfigObject = {
  table: string
  type: ExportTypes
  columns?: ColumnConfig
  dependencies?: Array<string>
}

type ColumnConfig = Record<string, CallableFunction>

type ImportDefinition = Array<ConfigObject>

export { ExportTypes, ConfigObject, ImportDefinition, ColumnConfig }
