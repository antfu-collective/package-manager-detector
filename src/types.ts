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

export interface DetectOptions {
  cwd?: string
  /**
   * Callback when unknown package manager from package.json.
   *
   * @param packageManager - The `packageManager` value from package.json file.
   */
  onUnknown?: (packageManager: string) => DetectResult | null | undefined
}

export interface DetectResult {
  agent: Agent
  version?: string
}
