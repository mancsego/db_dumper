import loki from 'lokijs'

const db = new loki('query_storage.db')
const history = db.addCollection('history')

const saveHistory = (table: string, query: string): void => {
  history.insert({ table, query })
}

const getWherePartForDependency = (table: string, primaryColumn: string): string => {
  const entry = history.findOne({ table })
  if (!entry) return `"${primaryColumn}" = "${primaryColumn}"`

  const subSelect = entry.query
    .replace('SELECT *', `SELECT ${primaryColumn}`)
    .replace(';', '')

  return `${primaryColumn} IN (${subSelect})`
}

export { saveHistory, getWherePartForDependency }