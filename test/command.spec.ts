import type { Agent } from '../src'
import { describe, expect, it } from 'vitest'
import { COMMANDS, resolveCommand } from '../src/commands'

Object.entries(COMMANDS)
  .map(([pm, c]) => [pm as Agent, c] as const)
  .forEach(([pm]) => {
    describe(`test ${pm} run command`, () => {
      it ('command handles args correctly', () => {
        const args = resolveCommand(pm, 'run', ['arg0', 'arg1-0 arg1-1'])
        expect(args).toBeDefined()
        expect(args).toMatchSnapshot()
      })
    })
    describe(`test ${pm} add command`, () => {
      it ('command handles args correctly', () => {
        const args = resolveCommand(pm, 'add', ['@antfu/ni', '-D'])
        expect(args).toBeDefined()
        expect(args).toMatchSnapshot()
      })
    })
    describe(`test ${pm} execute command`, () => {
      it ('command handles args correctly', () => {
        const args = resolveCommand(pm, 'execute', ['eslint', '--fix'])
        expect(args).toMatchSnapshot()
      })
    })
  })

describe('npm run workspace flag handling', () => {
  it('keeps `-w <value>` together with the script name (no unwanted `--`)', () => {
    const resolved = resolveCommand('npm', 'run', ['-w', 'packages/foo', 'test'])
    expect(resolved).toEqual({ command: 'npm', args: ['run', '-w', 'packages/foo', 'test'] })
  })

  it('keeps `--workspace <value>` together with the script name', () => {
    const resolved = resolveCommand('npm', 'run', ['--workspace', 'packages/foo', 'test'])
    expect(resolved).toEqual({ command: 'npm', args: ['run', '--workspace', 'packages/foo', 'test'] })
  })

  it('passes script args after the script through `--`', () => {
    const resolved = resolveCommand('npm', 'run', ['-w', 'packages/foo', 'test', '--grep', 'bar'])
    expect(resolved).toEqual({
      command: 'npm',
      args: ['run', '-w', 'packages/foo', 'test', '--', '--grep', 'bar'],
    })
  })

  it('still supports `-w=<value>` form', () => {
    const resolved = resolveCommand('npm', 'run', ['-w=packages/foo', 'test'])
    expect(resolved).toEqual({ command: 'npm', args: ['run', '-w=packages/foo', 'test'] })
  })

  it('handles `-w` without explicit value (treated as boolean-ish)', () => {
    const resolved = resolveCommand('npm', 'run', ['--if-present', 'test'])
    expect(resolved).toEqual({ command: 'npm', args: ['run', '--if-present', 'test'] })
  })
})

describe('pnpm@6 run filter flag handling', () => {
  it('keeps `-F <value>` together with the script name', () => {
    const resolved = resolveCommand('pnpm@6', 'run', ['-F', 'packages/foo', 'test'])
    expect(resolved).toEqual({ command: 'pnpm', args: ['run', '-F', 'packages/foo', 'test'] })
  })
})
