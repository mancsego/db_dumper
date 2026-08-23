import { ImportDefinition } from './exporter/config/types'

declare module '#root/definition.dist' {
  const config: ImportDefinition
  export default config
}

declare module '#root/definition.local' {
  const config: ImportDefinition
  export default config
}

declare module '#root/definition' {
  const config: ImportDefinition
  export default config
}
