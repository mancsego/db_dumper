import { ConfigObject, ImportDefinition } from './types'

const loadConfiguration = async (): Promise<ImportDefinition> => {
  try {
    const { default: config } = await import('#root/definition.local')
    return _sortConfiguration(config)
  } catch (e) {
    console.error(
      'Using default #root/definition.dist. Could not process definition.local configuration: ',
      e
    )

    const { default: config } = await import('#root/definition.dist')
    return _sortConfiguration(config)
  }
}

const _sortConfiguration = (config: ImportDefinition): ImportDefinition => {
  const tableNames = new Set(config.map((c) => c.table))

  config.forEach(({ table, dependencies }) => {
    dependencies?.forEach(({ table: depTable }) => {
      if (!tableNames.has(depTable)) {
        throw new Error(
          `Table '${table}' depends on '${depTable}', but '${depTable}' is not defined in the export configuration.`
        )
      }
    })
  })

  const { unresolvedCount, dependents } = _createDependencyGraphs(config)
  const sortedConfig: ImportDefinition = []
  const reCalculate = _reCalculateUnresolved(unresolvedCount)

  while (unresolvedCount.size > 0) {
    const readyToResolve: string[] = []

    unresolvedCount.forEach((count, table) => {
      if (count === 0) {
        readyToResolve.push(table)
      }
    })

    if (readyToResolve.length === 0) {
      const remaining = Array.from(unresolvedCount.keys()).join(', ')
      throw new Error(`Cyclic dependency detected among tables: ${remaining}`)
    }

    readyToResolve.forEach((table) => {
      dependents.get(table)?.forEach(reCalculate)
      const found = config.find((e) => e.table === table)
      if (found) sortedConfig.push(found)
      unresolvedCount.delete(table)
    })
  }

  return sortedConfig
}

const _reCalculateUnresolved =
  (unresolvedCount: Map<string, number>) => (dependent: string) => {
    unresolvedCount.set(dependent, (unresolvedCount.get(dependent) ?? 1) - 1)
  }

const _createDependencyGraphs = (config: ImportDefinition) => {
  const unresolvedCount: Map<string, number> = new Map()
  const dependents: Map<string, Array<string>> = new Map()

  config.forEach(({ table, dependencies }) => {
    unresolvedCount.set(table, dependencies?.length ?? 0)

    dependencies?.forEach(({ table: dependency }) => {
      dependents.set(dependency, [...(dependents.get(dependency) ?? []), table])
    })
  })

  return {
    unresolvedCount,
    dependents
  }
}

export { loadConfiguration }
