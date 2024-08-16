import type { Agent } from './agents'
import { COMMANDS } from './agents'

export type CommandType = [command: string, args: string[]]
export interface AgentCommand {
  'agent': string
  'run': CommandType | ((args: string[]) => CommandType)
  'install': CommandType
  'frozen': CommandType
  'global': CommandType
  'add': CommandType
  'upgrade': CommandType
  'upgrade-interactive': CommandType | null
  'execute': CommandType
  'uninstall': CommandType
  'global_uninstall': CommandType
}

function npmRun(agent: string) {
  return (args: string[]): CommandType => {
    return args.length > 1
      ? [agent, ['run', args[0], '--', ...args.slice(1)]]
      : [agent, ['run', args[0]]]
  }
}

function buildCommand(command: string) {
  const [cmd, ...args] = command.split(' ')
  return [cmd, args] as CommandType
}

function buildCommands(agent: Agent, commands: typeof COMMANDS.npm) {
  return {
    'agent': commands.agent,
    'run': typeof commands.run === 'function'
      ? npmRun(agent.includes('@') ? agent.split('@')[0] : agent)
      : buildCommand(commands.run),
    'install': buildCommand(commands.install),
    'frozen': buildCommand(commands.frozen),
    'global': buildCommand(commands.global),
    'add': buildCommand(commands.add),
    'upgrade': buildCommand(commands.upgrade),
    'upgrade-interactive': commands['upgrade-interactive']
      ? buildCommand(commands['upgrade-interactive'])
      : null,
    'execute': buildCommand(commands.execute),
    'uninstall': buildCommand(commands.uninstall),
    'global_uninstall': buildCommand(commands.global_uninstall),
  } satisfies AgentCommand
}

export const AGENT_COMMANDS = Object.entries(COMMANDS)
  .map(([pm, commands]) => [pm, buildCommands(pm as Agent, commands as any)] as const)
  .reduce((acc, [pm, commands]) => {
    acc[pm as Agent] = buildCommands(pm as Agent, commands as any)
    return acc
  }, {} as Record<Agent, ReturnType<typeof buildCommands>>)
