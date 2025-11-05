import antfu from '@antfu/eslint-config'

export default antfu(
  {
    files: ['test/**/bun/package.json'],
    rules: {
      'jsonc/comma-dangle': ['warn', 'always-multiline'],
    },
  },
)
