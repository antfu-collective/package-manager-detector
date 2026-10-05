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
    describe(`test ${pm} why command`, () => {
      it ('command handles args correctly', () => {
        const args = resolveCommand(pm, 'why', ['vite'])
        expect(args).toMatchSnapshot()
      })
    })
  })

describe('deno add', () => {
  it('prefixes bare package names with `npm:`', () => {
    expect(resolveCommand('deno', 'add', ['-D', 'vite', 'jsr:@std/path', 'npm:@antfu/ni'])).toEqual({
      command: 'deno',
      args: ['add', '-D', 'npm:vite', 'jsr:@std/path', 'npm:@antfu/ni'],
    })
  })

  it.each(['--npm', '--jsr'])('leaves args untouched when %s is passed', (flag) => {
    expect(resolveCommand('deno', 'add', [flag, 'vite'])).toEqual({
      command: 'deno',
      args: ['add', flag, 'vite'],
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

describe('ignoreWorkspaceRootCheck option', () => {
  it.each([
    ['pnpm', 'add', 'pnpm', ['add', '--ignore-workspace-root-check', 'vite']],
    ['pnpm', 'uninstall', 'pnpm', ['remove', 'vite']],
    ['yarn', 'add', 'yarn', ['add', '--ignore-workspace-root-check', 'vite']],
    ['yarn', 'uninstall', 'yarn', ['remove', '--ignore-workspace-root-check', 'vite']],
    ['yarn@berry', 'add', 'yarn', ['add', 'vite']],
    ['npm', 'add', 'npm', ['i', 'vite']],
  ] as const)('resolves %s %s', (agent, cmd, command, args) => {
    expect(resolveCommand(agent, cmd, ['vite'], { ignoreWorkspaceRootCheck: true })).toEqual({ command, args })
  })
})

describe('minimumReleaseAge option', () => {
  it.each([
    ['npm', 'add', 'npm', ['i', '--min-release-age=3', 'vite']],
    ['npm', 'frozen', 'npm', ['ci', 'vite']],
    ['pnpm', 'execute', 'pnpm', ['dlx', '--config.minimum-release-age=4320', 'vite']],
    ['bun', 'add', 'bun', ['add', '--minimum-release-age=259200', 'vite']],
    ['bun', 'execute', 'bun', ['x', 'vite']],
    ['deno', 'add', 'deno', ['add', '--minimum-dependency-age=4320', 'npm:vite']],
    ['nub', 'execute', 'nubx', ['--minimum-release-age=4320', 'vite']],
    ['upm', 'install', 'upm', ['install', '--min-release-age=3', 'vite']],
    ['yarn@berry', 'add', 'yarn', ['add', 'vite']],
    ['pnpm@6', 'add', 'pnpm', ['add', 'vite']],
  ] as const)('resolves %s %s', (agent, cmd, command, args) => {
    expect(resolveCommand(agent, cmd, ['vite'], { minimumReleaseAge: 3 * 24 * 60 })).toEqual({ command, args })
  })
})
