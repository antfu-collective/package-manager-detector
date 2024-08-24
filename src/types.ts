export type Agent = 'npm' | 'yarn' | 'yarn@berry' | 'pnpm' | 'pnpm@6' | 'bun'

export type AgentCommandValue = (string | number)[] | ((args?: string[]) => string[]) | null

export interface AgentCommands {
  'agent': AgentCommandValue
  'run': AgentCommandValue
  'install': AgentCommandValue
  'frozen': AgentCommandValue
  'global': AgentCommandValue
  'add': AgentCommandValue
  'upgrade': AgentCommandValue
  'upgrade-interactive': AgentCommandValue
  'execute': AgentCommandValue
  'uninstall': AgentCommandValue
  'global_uninstall': AgentCommandValue
}

export type Command = keyof AgentCommands

export interface CommandType {
  command: string
  arguments: string[]
  toString: () => string
}

export type CommandReturnType = (args?: string[]) => CommandType

export interface ResolvedCommand {
  command: string
  args: string[]
}
