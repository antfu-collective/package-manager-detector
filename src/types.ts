export type Agent = 'npm' | 'yarn' | 'yarn@berry' | 'pnpm' | 'pnpm@6' | 'bun' | 'deno'
export type AgentName = 'npm' | 'yarn' | 'pnpm' | 'bun' | 'deno'

export type AgentCommandValue = (string | number)[] | ((args: string[]) => string[]) | null

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
  'execute-local': AgentCommandValue
  'uninstall': AgentCommandValue
  'global_uninstall': AgentCommandValue
}

export type Command = keyof AgentCommands

export interface ResolvedCommand {
  /**
   * CLI command.
   */
  command: string
  /**
   * Arguments for the CLI command, merged with user arguments.
   */
  args: string[]
}

export interface DetectOptions {
  /**
   * Current working directory to start looking up for package manager.
   * @default `process.cwd()`
   */
  cwd?: string
  /**
   * Callback when unknown package manager from package.json.
   * @param packageManager - The `packageManager` value from package.json file.
   */
  onUnknown?: (packageManager: string) => DetectResult | null | undefined
}

export interface DetectResult {
  /**
   * Agent name without the specifier.
   *
   * Can be `npm`, `yarn`, `pnpm`, `bun`, or `deno`.
   */
  name: AgentName
  /**
   * Agent specifier to resolve the command.
   *
   * May contain '@' to differentiate the version (e.g. 'yarn@berry').
   * Use `name` for the agent name without the specifier.
   */
  agent: Agent
  /**
   * Specific version of the agent, read from `packageManager` field in package.json.
   */
  version?: string
}
