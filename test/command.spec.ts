import { describe, expect, it } from 'vitest'
import type { Agent } from '../src'
import { COMMANDS, constructCommand } from '../src/agents'

Object.entries(COMMANDS)
  .map(([pm, c]) => [pm, c] as const)
  .forEach(([pm, commands]) => {
    describe(`test ${pm} run command`, () => {
      it ('command handles args correctly', () => {
        const args = constructCommand(commands.run, ['arg0', 'arg1-0 arg1-1'])
        expect(args).toBeDefined()
        expect(args).toMatchSnapshot()
      })
    })
    describe(`test ${pm} add command`, () => {
      it ('command handles args correctly', () => {
        const args = constructCommand(commands.add, ['@antfu/ni', '-D'])
        expect(args).toBeDefined()
        expect(args).toMatchSnapshot()
      })
    })
  })
