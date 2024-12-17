# DB Dumper

## Example config for the test DB

```dotenv
HOST=127.0.0.1
DB_USER=i-am-mr-user
DB_PASSWORD=pwd-1234
TARGET_DB=target-db
```

```javascript
import { ExportTypes, ImportDefinition } from '#src/exporter/config/types'
import { setToDefault } from '#src/transformer/generalTransformer'
import { maskText } from '#src/transformer/textTransformers'

const config: ImportDefinition = [
  {
    table: 'users',
    type: ExportTypes.FILTER,
    columns: {
      firstName: maskText,
      lastName: maskText,
      createdAt: setToDefault,
      updatedAt: setToDefault
    },
    primary: 'userId'
  },
  {
    table: 'roles',
    type: ExportTypes.DATA,
    columns: {
      createdAt: setToDefault,
      updatedAt: setToDefault
    },
    primary: 'roleId'
  },
  {
    table: 'userToRole',
    type: ExportTypes.DATA,
    columns: {
      createdAt: setToDefault,
      updatedAt: setToDefault
    },
    dependencies: ['users', 'roles'],
    primary: ''
  },
  {
    table: 'items',
    type: ExportTypes.DATA,
    columns: {
      createdAt: setToDefault,
      updatedAt: setToDefault
    },
    dependencies: ['users'],
    primary: 'itemId'
  }
]

export default config

```
