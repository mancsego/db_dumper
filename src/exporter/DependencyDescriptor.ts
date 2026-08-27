import loki from 'lokijs'
import { IDialect } from '#src/dialect/IDialect'

const db = new loki('query_storage.db')
const history = db.addCollection('history')

const clearHistory = (): void => {
  history.clear()
}

const saveHistory = (table: string, query: string): void => {
  history.insert({ table, query })
}

const getJoinForDependency = (
  dialect: IDialect,
  agentTable: string,
  parentTable: string,
  parentColumn: string,
  foreignColumn: string = parentColumn
): string => {
  const entry = history.findOne({ table: parentTable })
  if (!entry) return ''

  const q = dialect.quoteIdentifier(parentTable)
  const qCol = dialect.quoteIdentifier(parentColumn)

  const subSelect = entry.query
    .replace(/SELECT\s+\*/i, `SELECT DISTINCT ${q}.${qCol}`)
    .replace(/;+\s*$/, '')

  return dialect.buildJoinSubquery(
    parentTable,
    parentColumn,
    agentTable,
    foreignColumn,
    subSelect
  )
}

export { clearHistory, saveHistory, getJoinForDependency }
