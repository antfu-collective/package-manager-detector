import antfu from '@antfu/eslint-config'

export default await antfu({
  markdown: {
    overrides: {
      'dot-notation': 'off',
    },
  },
})
