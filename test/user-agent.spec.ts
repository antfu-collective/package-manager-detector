import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getUserAgent } from '../src/detect'
import { resolveCommand } from '../src/commands'

describe('get user agent', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })
  ;[
    ['npm', 'npm/10.9.0 node/v20.17.0 linux x64 workspaces/false'],
    ['yarn', 'yarn/1.22.11 npm/? node/v14.17.6 darwin x64'],
    ['yarn@berry', 'yarn/4.13.0 npm/? node/v24.13.0 darwin arm64'],
    ['yarn@berry', 'yarn/2.4.2 npm/? node/v16.0.0 linux x64'],
    ['pnpm', 'pnpm/9.12.1 npm/? node/v20.17.0 linux x64'],
    ['pnpm@6', 'pnpm/6.35.1 npm/? node/v16.0.0 linux x64'],
    ['bun', 'bun/1.1.8 npm/? node/v21.6.0 linux x64'],
    ['deno', 'deno/2.0.5 npm/? node/v21.6.0 linux x64'],
    ['nub', 'nub/0.2.4 npm/? node/v22.0.0 darwin arm64'],
    ['aube', 'aube/1.0.0 npm/? node/v22.0.0 linux x64'],
    ['upm', 'upm/1.2.0 npm/? node/v22.0.0 linux x64'],
  ].forEach(([agent, detection]) => {
    it(`${agent} detected with ${detection}`, () => {
      vi.stubEnv(
        'npm_config_user_agent',
        detection,
      )
      expect(getUserAgent()).toBe(agent)
    })
  })

  it('returns null when npm_config_user_agent is unset', () => {
    vi.stubEnv('npm_config_user_agent', '')
    expect(getUserAgent()).toBe(null)
  })

  it('returns null for an unknown package manager', () => {
    vi.stubEnv('npm_config_user_agent', 'unknown/1.0.0 npm/? node/v20.0.0 linux x64')
    expect(getUserAgent()).toBe(null)
  })

  it('resolves yarn berry execute-local without a literal --', () => {
    vi.stubEnv('npm_config_user_agent', 'yarn/4.13.0 npm/? node/v24.13.0 darwin arm64')
    const agent = getUserAgent()
    expect(agent).toBe('yarn@berry')
    expect(resolveCommand(agent!, 'execute-local', ['playwright', 'test', '--list'])).toEqual({
      command: 'yarn',
      args: ['exec', 'playwright', 'test', '--list'],
    })
  })
})
