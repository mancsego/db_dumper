import { ImportDefinition } from './types'

const loadConfiguration = async (): Promise<ImportDefinition> => {
  try {
    const { default: config } = await import('#root/definition.local')
    return config.sort(
      ({ dependencies: dp1 }, { dependencies: dp2 }) =>
        (dp1?.length ?? 0) - (dp2?.length ?? 0)
    )
  } catch (_) {
    console.warn(
      'Definition module (#root/definition.local.ts) missing, loading empty configuration.'
    )

    const { default: config } = await import('#root/definition.dist')
    return config
  }
}

export { loadConfiguration }
