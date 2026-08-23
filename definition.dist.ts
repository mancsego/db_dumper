/* eslint-disable @typescript-eslint/no-unused-vars */
import { ExportTypes, ImportDefinition } from '#src/exporter/config/types'

const config: ImportDefinition = [
  /*
  {
    table: 'table_with_structure_and_data',
    type: ExportTypes.DATA,
    columns: {
      column_name: (val) => val
    },
    dependencies: [{ table: 'parent_table', column: 'parent_id' }]
  },
  {
    table: 'table_with_structure',
    limit: 100,
    type: ExportTypes.STRUCTURE_ONLY
  }
  */
]

export default config
