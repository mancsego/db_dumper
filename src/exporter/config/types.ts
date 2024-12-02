enum ExportTypes {
  STRUCTURE_ONLY,
  DATA,
  FILTER
}

type ConfigObject = {
  type: ExportTypes
  columns?: Record<string, CallableFunction>
}

type ImportDefinition = Record<string, ConfigObject>

type ColumnExport = Array<Record<string, unknown>>

export { ExportTypes, ConfigObject, ImportDefinition, ColumnExport }
