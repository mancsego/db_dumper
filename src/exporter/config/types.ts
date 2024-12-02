enum EXPORT_TYPES {
  STRUCTURE_ONLY,
  DATA
}

type CONFIG_OBJECT = {
  type: EXPORT_TYPES
  columns?: Record<string, CallableFunction>
}

export { EXPORT_TYPES, CONFIG_OBJECT }
