# DB Dumper

A configurable, high-performance Node.js & TypeScript service to extract, sanitize, and export MySQL database dumps with selective schema dumping, relational dependency resolution, and column-level data transformation.

---

## Features

- **Selective Exporting**: Choose whether to dump table structure only (`ExportTypes.STRUCTURE_ONLY`) or full table data (`ExportTypes.DATA`).
- **Relational Dependency Resolution**: Automatically filters child/dependent tables using subquery joins based on parent table queries (`WHERE` / `LIMIT` conditions).
- **Topological Sorting**: Resolves table dependencies automatically so parent tables are dumped before dependent tables.
- **Data Anonymization & Transformation**: Custom transformer hooks on a per-column basis (e.g., data masking, replacing with `NULL` or `DEFAULT`, ISO timestamp conversions).
- **Non-blocking Worker Thread**: Executes the dump process asynchronously in a Node.js `worker_threads` Worker process to avoid blocking the HTTP server.
- **REST Trigger**: Simple HTTP API endpoint to trigger dumps and prevent duplicate concurrent executions.

---

## Prerequisites

- **Node.js**: v18+ (or [Bun](https://bun.sh/))
- **Docker & Docker Compose** (optional, for local MySQL testing)

---

## Quick Start

### 1. Clone & Install Dependencies

```bash
# Using npm
npm install

# Or using bun
bun install
```

### 2. Configure Environment

Create a `.env` file from the provided template:

```bash
cp .env.dist .env
```

Configure your database credentials in `.env`:

```dotenv
HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=root
TARGET_DB=db
```

### 3. (Optional) Run Test Database with Docker

A test MySQL container with sample schema and seed data is included in `docker-compose.yml` and `.initdb/test.sql`:

```bash
docker compose up -d
```

### 4. Create Export Definition

Create a `definition.local.ts` file in the project root to define which tables to export and how columns should be transformed.

```typescript
import { ExportTypes, ImportDefinition, Connector } from '#src/exporter/config/types'
import { setToDefault, setToNull } from '#src/transformer/generalTransformer'
import { maskText } from '#src/transformer/textTransformers'

const config: ImportDefinition = [
  {
    table: 'users',
    type: ExportTypes.DATA,
    limit: 10,
    columns: {
      firstName: maskText,
      lastName: maskText,
      createdAt: setToDefault,
      updatedAt: setToDefault
    }
  },
  {
    table: 'roles',
    type: ExportTypes.DATA,
    columns: {
      createdAt: setToDefault,
      updatedAt: setToDefault
    }
  },
  {
    table: 'userToRole',
    type: ExportTypes.DATA,
    columns: {
      createdAt: setToDefault,
      updatedAt: setToDefault
    },
    dependencies: [
      { table: 'users', column: 'userId' },
      { table: 'roles', column: 'roleId' }
    ]
  },
  {
    table: 'items',
    type: ExportTypes.DATA,
    columns: {
      createdAt: setToDefault,
      updatedAt: setToDefault
    },
    dependencies: [
      { table: 'users', column: 'userId' }
    ]
  }
]

export default config
```

> **Note:** If `definition.local.ts` is not present, DB Dumper will fall back to `definition.dist.ts`.

---

## Running the Application

### Development Mode

Run the server with live reload using nodemon:

```bash
npm run dev
```

### Production Build & Start

```bash
npm run build
npm start
```

### Triggering a Dump

Trigger the database dump process via an HTTP GET request:

```bash
curl http://localhost:3000/
```

#### API Responses:
- **`202 Accepted`**: Dump process started in background worker thread. Returns `{ "data": "Task <uuid> started" }`.
- **`429 Too Many Requests`**: A dump task is already in progress. Returns `{ "data": "Task <uuid> is still in progress." }`.

---

## Output

Generated SQL dumps are written to the `dumps/` directory:

```
dumps/dump_<DD_MM_YYYY>_<task_id>.sql
```

If an error occurs during the export process, the partial dump file is automatically cleaned up.

---

## Configuration Reference

### `ExportTypes`
| Value | Description |
| :--- | :--- |
| `ExportTypes.DATA` (`1`) | Dumps `SHOW CREATE TABLE` DDL and `INSERT INTO` table data rows. |
| `ExportTypes.STRUCTURE_ONLY` (`0`) | Dumps only the `SHOW CREATE TABLE` DDL statement without data rows. |

### Table Configuration Options (`ConfigObject`)
| Property | Type | Description |
| :--- | :--- | :--- |
| `table` | `string` | Database table name. |
| `type` | `ExportTypes` | `ExportTypes.DATA` or `ExportTypes.STRUCTURE_ONLY`. |
| `limit` | `number` (optional) | Limits the number of exported rows. |
| `where` | `Array<{ condition: string, connector: Connector }>` (optional) | WHERE clause conditions (`AND`, `OR`, `IN`). |
| `columns` | `Record<string, (val: any) => any>` (optional) | Map of column names to transformation functions. |
| `dependencies` | `Array<{ table: string, column: string }>` (optional) | Parent table dependencies for automatic relational inner join filtering. |

---

## Available Transformers

Import transformers from `#src/transformer/...`:

- **`maskText`** (`#src/transformer/textTransformers`): Masks strings by keeping the first letter and replacing the remaining characters with `*` (e.g. `"John"` -> `"J***"`).
- **`setToDefault`** (`#src/transformer/generalTransformer`): Inserts SQL keyword `DEFAULT`.
- **`setToNull`** (`#src/transformer/generalTransformer`): Inserts `NULL`.
- **`toIsoDate`** (`#src/transformer/generalTransformer`): Formats date string into ISO SQL timestamp format (`YYYY-MM-DD HH:mm:ss`).

You can also pass custom functions: `(val: unknown) => transformedValue`.

---

## Available Scripts

| Script | Description |
| :--- | :--- |
| `npm run dev` | Starts server in watch mode using `nodemon` and `ts-node`. |
| `npm start` | Runs server directly with `ts-node ./app.ts`. |
| `npm run build` | Compiles TypeScript files using `tsc`. |
| `npm run lint` | Runs ESLint. |
| `npm run lint:fix` | Runs ESLint and automatically fixes formatting/lint issues. |
| `npm run format` | Formats codebase using Prettier. |

---

## Developer & Agent Guide

For detailed architecture diagrams, internal data flow, and development guidelines for AI agents, see [`AGENTS.md`](./AGENTS.md).

---

## License

[MIT](./LICENSE)
