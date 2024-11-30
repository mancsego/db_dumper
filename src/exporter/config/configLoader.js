const loadConfiguration = async () => {
  try {
    const { default: config } = await import('#root/definition.js')
    return config
  } catch (_) {
    console.warn(
      'Definition module (#root/definition.js) missing, loading empty configuration.'
    )

    const { default: config } = await import('#root/definition.dist.js')
    return config
  }
}

export { loadConfiguration }
