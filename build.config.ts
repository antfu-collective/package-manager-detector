import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    'src/index.ts',
    'src/commands.ts',
    'src/detect.ts',
    'src/constants.ts',
  ],
  clean: true,
  declaration: 'node16',
  rollup: {
    dts: {
      respectExternal: true,
    },
    inlineDependencies: [
      'strip-json-comments',
    ],
  },
})
