import { describe, expect, it } from 'vitest'
import { handleVersion, resolveAgent } from '../src/detect'

describe('handleVersion', () => {
  it.each([
    ['9.12.1', '9.12.1'],
    ['^9.12.1', '9.12.1'],
    ['>=8', '8'],
    ['10.0.0+sha512.abc123', '10.0.0'],
    ['1.2.3.4', '1.2.3'],
    ['latest', 'latest'],
    [undefined, undefined],
  ])('%s -> %s', (input, expected) => {
    expect(handleVersion(input)).toBe(expected)
  })
})

describe('resolveAgent', () => {
  it('maps yarn > 1 to yarn@berry', () => {
    expect(resolveAgent('yarn', '4.1.0')).toEqual({ name: 'yarn', agent: 'yarn@berry', version: 'berry' })
  })

  it('keeps yarn 1 as classic yarn', () => {
    expect(resolveAgent('yarn', '1.22.19')).toEqual({ name: 'yarn', agent: 'yarn', version: '1.22.19' })
  })

  it('maps pnpm < 7 to pnpm@6', () => {
    expect(resolveAgent('pnpm', '6.35.1')).toEqual({ name: 'pnpm', agent: 'pnpm@6', version: '6.35.1' })
  })

  it('keeps pnpm >= 7 as pnpm', () => {
    expect(resolveAgent('pnpm', '9.12.1')).toEqual({ name: 'pnpm', agent: 'pnpm', version: '9.12.1' })
  })

  it.each(['npm', 'yarn', 'pnpm', 'bun', 'deno'] as const)('resolves %s without a version', (name) => {
    expect(resolveAgent(name)).toEqual({ name, agent: name, version: undefined })
  })
})
