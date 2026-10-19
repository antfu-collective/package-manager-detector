import * as childProcess from 'node:child_process'
import { describe, expect, it, vi } from 'vitest'
import { resolveCommand } from '../src/commands'
import { detectConfigFlags } from '../src/config'

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}))

describe('detectConfigFlags', () => {
  it('returns empty object for unsupported agents', () => {
    expect(detectConfigFlags('deno')).toEqual({})
    expect(detectConfigFlags('bun')).toEqual({})
  })

  it('detects save-exact for npm', () => {
    vi.mocked(childProcess.execSync).mockReturnValue('true\n')
    expect(detectConfigFlags('npm')).toEqual({ saveExact: true })
  })
})

describe('resolveCommand with includeConfigFlags', () => {
  it('includes configArgs for npm add when save-exact is true', () => {
    vi.mocked(childProcess.execSync).mockReturnValue('true\n')
    const result = resolveCommand('npm', 'add', ['vite'], { includeConfigFlags: true })
    expect(result).toEqual({
      command: 'npm',
      args: ['i', 'vite'],
      configArgs: ['--save-exact'],
    })
  })
})
