import { defineBuildConfig } from 'unbuild'
import Quansync from 'unplugin-quansync/rollup'

export default defineBuildConfig({
  entries: [
    'src/index.ts',
    'src/commands.ts',
    'src/detect.ts',
    'src/constants.ts',
  ],
  clean: true,
  declaration: true,
  rollup: {
    emitCJS: true,
    inlineDependencies: true,
  },
  hooks: {
    'rollup:options': function (ctx, options) {
      options.plugins.push(Quansync())
    },
  },
})
