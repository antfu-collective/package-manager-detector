import { describe, expect, it } from 'vitest'
import type { Agent } from '../src'
import { AGENT_COMMANDS, COMMANDS } from '../src/agents'

Object.entries(AGENT_COMMANDS)
  .map(([pm, c]) => [pm, c.run] as const)
  .forEach(([pm, runCommand]) => {
    describe.runIf(typeof runCommand === 'function')(`${pm} run command`, () => {
      it ('object format handles args correctly', () => {
        const command = typeof runCommand === 'function' ? runCommand(['arg0', 'arg1-0 arg1-1']) : undefined
        const run0 = typeof COMMANDS[pm as Agent]!.run === 'function' ? COMMANDS[pm as Agent]!.run : undefined
        const command0 = typeof run0 === 'function' ? run0(['arg0', 'arg1-0 arg1-1']) : undefined
        expect(command).toBeDefined()
        expect(command?.length).toBe(2)
        expect(command![1].length).toBe(4)
        expect(command![1][3]).toBe('arg1-0 arg1-1')
        expect(command0).toBeDefined()
        expect([command![0], ...command![1]].join(' ')).toBe(command0)
        expect(command).toMatchSnapshot()
      })
    })
    describe.runIf(typeof runCommand !== 'function')(`${pm} run command`, () => {
      it ('string format converted correctly', () => {
        const command = typeof runCommand !== 'function' ? [runCommand[0], ...runCommand[1]].join(' ') : undefined
        expect(command).toBeDefined()
        expect(command).toBe(COMMANDS[pm as Agent]!.run)
        expect(command).toMatchSnapshot()
      })
    })
  })
