import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getUserAgent } from '../src/detect'

describe('get user agent', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })
  ;[
    ['npm', 'npm/10.9.0 node/v20.17.0 linux x64 workspaces/false'],
    ['yarn', 'yarn/1.22.11 npm/? node/v14.17.6 darwin x64'],
    ['pnpm', 'pnpm/9.12.1 npm/? node/v20.17.0 linux x64'],
  ].forEach(([agent, detection]) => {
    it(`${agent} detected with ${detection}`, () => {
      vi.stubEnv(
        'npm_config_user_agent',
        detection,
      )
      expect(getUserAgent()).toBe(agent)
    })
  })
})
