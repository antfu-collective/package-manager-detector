import type { Agent } from '../src'
import { describe, expect, it } from 'vitest'
import { COMMANDS, resolveCommand, splitRunArgs } from '../src/commands'

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

describe('splitRunArgs', () => {
  it('treats the first positional arg as the script', () => {
    expect(splitRunArgs(['dev'])).toEqual({ before: [], script: 'dev', after: [] })
  })

  it('forwards trailing args as script args', () => {
    expect(splitRunArgs(['test', 'arg1', 'arg2'])).toEqual({
      before: [],
      script: 'test',
      after: ['arg1', 'arg2'],
    })
  })

  it('keeps a boolean flag before the script', () => {
    expect(splitRunArgs(['--if-present', 'test'])).toEqual({
      before: ['--if-present'],
      script: 'test',
      after: [],
    })
  })

  it('keeps a value-taking flag and its value before the script', () => {
    expect(splitRunArgs(['-w', 'packages/foo', 'test'], ['-w', '--workspace'])).toEqual({
      before: ['-w', 'packages/foo'],
      script: 'test',
      after: [],
    })
  })

  it('does not consume the value of an unregistered flag', () => {
    // `-w` is not registered, so `packages/foo` is taken as the script.
    expect(splitRunArgs(['-w', 'packages/foo', 'test'])).toEqual({
      before: ['-w'],
      script: 'packages/foo',
      after: ['test'],
    })
  })

  it('handles the `--flag=value` form without a registry', () => {
    expect(splitRunArgs(['-w=packages/foo', 'test'], ['-w', '--workspace'])).toEqual({
      before: ['-w=packages/foo'],
      script: 'test',
      after: [],
    })
  })

  it('returns no script when every arg is a flag', () => {
    expect(splitRunArgs(['--help'])).toEqual({ before: ['--help'], script: undefined, after: [] })
  })

  it('returns no script for empty args', () => {
    expect(splitRunArgs([])).toEqual({ before: [], script: undefined, after: [] })
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

  it('handles a boolean flag like `--if-present` before the script', () => {
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
