import { describe, expect, it } from 'vitest'
import type { Agent } from '../src'
import { AGENT_COMMANDS, COMMANDS } from '../src/agents'

Object.entries(AGENT_COMMANDS)
  .map(([pm, c]) => [pm, c.run, c.add] as const)
  .forEach(([pm, runCommand, addCommand]) => {
    describe(`test ${pm} run command`, () => {
      it ('command handles args correctly', () => {
        const command = runCommand(['arg0', 'arg1-0 arg1-1'])
        const run0 = COMMANDS[pm as Agent]!.run
        const command0 = typeof run0 === 'function' ? run0(['arg0', 'arg1-0 arg1-1']) : run0?.replace('{0}', ['arg0', '"arg1-0 arg1-1"'].join(' '))
        expect(command).toBeDefined()
        expect(run0).toBeDefined()
        expect(command0).toBeDefined()
        expect(command!.toString()).toBe(command0)
        expect(command).toMatchSnapshot()
      })
    })
    describe(`test ${pm} add command`, () => {
      it ('command handles args correctly', () => {
        const command = addCommand(['@antfu/ni', '-D'])
        const command0 = COMMANDS[pm as Agent]!.add.replace('{0}', ['@antfu/ni', '-D'].join(' '))
        expect(command).toBeDefined()
        expect(command!.toString()).toBe(command0)
        expect(command).toMatchSnapshot()
      })
    })
  })
