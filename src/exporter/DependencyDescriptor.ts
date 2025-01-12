import loki from 'lokijs'

const db = new loki('query_storage.db')
const history = db.addCollection('history')

const saveHistory = (table: string, query: string): void => {
  history.insert({ table, query })
}

const getJoinForDependency = (agentTable: string, table: string, primaryColumn: string): string => {
  const entry = history.findOne({ table })
  if (!entry) return `"${primaryColumn}" = "${primaryColumn}"`

  const subSelect = entry.query
    .replace('SELECT *', `SELECT ${primaryColumn}`)
    .replace(';', '')
  const subTable = `sub_${table}`

  return `INNER JOIN (${subSelect}) as ${subTable} ON ${subTable}.${primaryColumn} = ${agentTable}.${primaryColumn}`
}

export { saveHistory, getJoinForDependency }