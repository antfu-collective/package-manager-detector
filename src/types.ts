export type Agent = 'npm' | 'yarn' | 'yarn@berry' | 'pnpm' | 'pnpm@6' | 'pnpm-rush' | 'bun' | 'deno' | 'nub' | 'aube' | 'upm'
export type AgentName = 'npm' | 'yarn' | 'pnpm' | 'bun' | 'deno' | 'nub' | 'aube' | 'upm'

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
  'dedupe': AgentCommandValue
  'why': AgentCommandValue
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

export interface ResolveCommandOptions {
  /**
   * Pass `--ignore-workspace-root-check` to pnpm (`add`) and yarn v1 (`add`, `uninstall`).
   * @default false
   */
  ignoreWorkspaceRootCheck?: boolean
  /**
   * Minimum age in minutes a package version must have before it can be installed,
   * converted to each agent's own flag and unit.
   *
   * Applied to npm, pnpm, bun, deno, nub and upm on commands that resolve versions.
   * Ignored for yarn, aube and pnpm@6, which have no CLI flag for it.
   */
  minimumReleaseAge?: number
}

/**
 * Name of a strategy that is built into the detector.
 */
export type DetectStrategyName = 'rush' | 'lockfile' | 'packageManager-field' | 'devEngines-field' | 'install-metadata'

/**
 * What a custom strategy receives when it is called.
 *
 * A custom strategy runs once per directory, exactly like the built-in ones,
 * starting at `cwd` and walking up to the root.
 */
export interface StrategyContext {
  /**
   * The directory currently being visited.
   */
  directory: string
  /**
   * The (absolute) directory detection started from.
   */
  cwd: string
  /**
   * The options `detect()` was called with, so custom strategies can reuse
   * `packageJsonParser`, `onUnknown`, etc.
   */
  options: DetectOptions
  /**
   * The same file-system probe the built-in strategies use.
   */
  pathExists: (path: string, type: 'file' | 'dir') => Promise<boolean>
  /**
   * Stop walking up to the parent directories once the current directory has
   * been fully processed. Strategies that come after this one in the same
   * directory still run.
   */
  stop: () => void
}

/**
 * A custom strategy. Return a {@link DetectResult} to stop the detection,
 * or `null`/`undefined` to fall through to the next strategy.
 */
export type DetectStrategyFn = (context: StrategyContext) => DetectResult | null | undefined | Promise<DetectResult | null | undefined>

export type DetectStrategy = DetectStrategyName | DetectStrategyFn

export interface DetectOptions {
  /**
   * Current working directory to start looking up for package manager.
   * @default `process.cwd()`
   */
  cwd?: string
  /**
   * The strategies to use for detecting the package manager. The strategies
   * are executed in the order it's specified for every directory that it iterates
   * upwards from the `cwd`. A strategy that finds nothing falls through to the
   * next one.
   *
   * Built-in strategies are referenced by name:
   *
   * - `'rush'`: Look up for a `rush.json` file (Rush monorepos wrapping pnpm).
   * - `'lockfile'`: Look up for lock files.
   * - `'packageManager-field'`: Look up for the `packageManager` field in package.json.
   * - `'devEngines-field'`: Look up for the `devEngines.packageManager` field in package.json.
   * - `'install-metadata'`: Look up for installation metadata added by package managers.
   *
   * Custom strategies are plain functions, which makes it possible to insert
   * your own rules in front of (or between) the built-in ones.
   *
   * @default DEFAULT_STRATEGIES
   */
  strategies?: DetectStrategy[]
  /**
   * Callback when unknown package manager from package.json.
   * @param packageManager - The `packageManager` value from package.json file.
   */
  onUnknown?: (packageManager: string) => DetectResult | null | undefined
  /**
   * The path to stop traversing up the directory.
   */
  stopDir?: string | ((currentDir: string) => boolean)

  /**
   * Optional custom parser for `package.json` content.
   *
   * If provided, it will be used instead of `JSON.parse` when reading `package.json` files.
   * This can be used to support JSONC, YAML, or other formats.
   *
   * @param content - The content of the file.
   * @param filepath - The absolute path to the file.
   * @returns The parsed object or a Promise resolving to it.
   * @default JSON.parse
   */
  packageJsonParser?: (content: string, filepath: string) => any | Promise<any>
}

export interface DetectResult {
  /**
   * Agent name without the specifier.
   *
   * Can be `npm`, `yarn`, `pnpm`, `bun`, `deno`, `nub`, `aube`, or `upm`.
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
