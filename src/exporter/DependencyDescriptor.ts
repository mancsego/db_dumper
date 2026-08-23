import loki from 'lokijs'

const db = new loki('query_storage.db')
const history = db.addCollection('history')

const clearHistory = (): void => {
  history.clear()
}

const saveHistory = (table: string, query: string): void => {
  history.insert({ table, query })
}

const getJoinForDependency = (
  agentTable: string,
  parentTable: string,
  parentColumn: string,
  foreignColumn: string = parentColumn
): string => {
  const entry = history.findOne({ table: parentTable })
  if (!entry) return ''

  const subSelect = entry.query
    .replace(/SELECT\s+\*/i, `SELECT DISTINCT \`${parentTable}\`.\`${parentColumn}\``)
    .replace(/;+\s*$/, '')
  const subTable = `sub_${parentTable}`

  return `INNER JOIN (${subSelect}) AS \`${subTable}\` ON \`${subTable}\`.\`${parentColumn}\` = \`${agentTable}\`.\`${foreignColumn}\``
}

export { clearHistory, saveHistory, getJoinForDependency }