import { rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { defineBuildConfig } from 'unbuild'

const root = fileURLToPath(new URL('./dist', import.meta.url))

export default defineBuildConfig({
  entries: [
    'src/index.ts',
    'src/commands.ts',
    'src/detect.ts',
    'src/constants.ts',
    'src/types.ts',
  ],
  clean: false,
  declaration: true,
  rollup: {
    emitCJS: true,
    inlineDependencies: true,
  },
  hooks: {
    'build:done': async () => {
      await Promise.all([
        rm(resolve(root, 'types.cjs')),
        rm(resolve(root, 'types.mjs')),
      ])
    },
  },
})
