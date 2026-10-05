import { fileURLToPath } from 'node:url'
import { build } from 'unbuild'

const root = fileURLToPath(new URL('..', import.meta.url))

// tsnapi's snapshotApiPerEntry reads the built dist entries, so make sure
// the package is built before the exports snapshot tests run.
export async function setup(): Promise<void> {
  await build(root, false)
}
