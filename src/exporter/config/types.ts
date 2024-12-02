enum ExportTypes {
  STRUCTURE_ONLY,
  DATA,
  FILTER
}

type ConfigObject = {
  type: ExportTypes
  columns?: ColumnConfig
}

type ColumnConfig = Record<string, CallableFunction>

type ImportDefinition = Record<string, ConfigObject>

export { ExportTypes, ConfigObject, ImportDefinition, ColumnConfig }
