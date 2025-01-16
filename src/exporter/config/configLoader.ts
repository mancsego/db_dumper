import { ConfigObject, ImportDefinition } from './types'

let sortedCache: undefined | ImportDefinition

const loadConfiguration = async (): Promise<ImportDefinition> => {
  if (sortedCache) return sortedCache

  try {
    const { default: config } = await import('#root/definition.local')

    sortedCache = _sortConfiguration(config)
    return sortedCache
  } catch (e) {
    console.error(
      'Using default #root/definition.dist. Could not process configuration file: ',
      e
    )

    const { default: config } = await import('#root/definition.dist')
    return config
  }
}

const _sortConfiguration = (config: ImportDefinition) => {
  const { unresolvedCount, dependents } = _createDependencyGraphs(config)
  const sortedConfig: ImportDefinition = []
  const reCalculate = _reCalculateUnresolved(unresolvedCount)

  while (unresolvedCount.size) {
    unresolvedCount.forEach((count, table) => {
      if (count !== 0) return

      dependents.get(table)?.forEach(reCalculate)
      sortedConfig.push(config.find((e) => e.table === table) as ConfigObject)
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
