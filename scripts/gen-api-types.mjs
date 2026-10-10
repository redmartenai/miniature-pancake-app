// Regenerates src/api/schema.d.ts from the backend's OpenAPI contract (legendary-waffle-skl).
// Usage: npm run api:types [-- <path-or-url-to-openapi.yaml>]
// Defaults to EDUFLOW_OPENAPI, then to a sibling checkout of the backend repository.
import { spawnSync } from 'node:child_process'

const input = process.argv[2] || process.env.EDUFLOW_OPENAPI || '../legendary-waffle-skl/docs/api/openapi.yaml'
const result = spawnSync('npx', ['--yes', 'openapi-typescript@7.13.0', input, '-o', 'src/api/schema.d.ts'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
})
process.exit(result.status ?? 1)
