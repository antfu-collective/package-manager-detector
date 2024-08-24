import { describe, expect, it } from 'vitest'
import { COMMANDS, resolveCommand } from '../src/commands'
import type { Agent } from '../src'

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
  })
