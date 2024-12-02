const loadConfiguration = async () => {
  try {
    const { default: config } = await import('#root/definition.local')
    return config
  } catch (_) {
    console.warn(
      'Definition module (#root/definition.local.ts) missing, loading empty configuration.'
    )

    const { default: config } = await import('#root/definition.dist')
    return config
  }
}

export { loadConfiguration }
