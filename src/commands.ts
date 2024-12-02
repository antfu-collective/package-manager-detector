import type { Agent, AgentCommands, AgentCommandValue, Command, ResolvedCommand } from './types'

function npmRun(agent: string) {
  return (args: string[]) => {
    if (args.length > 1) {
      return [agent, 'run', args[0], '--', ...args.slice(1)]
    }
    else {
      return [agent, 'run', args[0]]
    }
  }
}

function denoExecute() {
  return (args: string[]) => {
    return ['deno', 'run', `npm:${args[0]}`, ...args.slice(1)]
  }
}

const npm: AgentCommands = {
  'agent': ['npm', 0],
  'run': npmRun('npm'),
  'install': ['npm', 'i', 0],
  'frozen': ['npm', 'ci'],
  'global': ['npm', 'i', '-g', 0],
  'add': ['npm', 'i', 0],
  'upgrade': ['npm', 'update', 0],
  'upgrade-interactive': null,
  'execute': ['npx', 0],
  'execute-local': ['npx', 0],
  'uninstall': ['npm', 'uninstall', 0],
  'global_uninstall': ['npm', 'uninstall', '-g', 0],
}

/** yarn 1 */
const yarn: AgentCommands = {
  'agent': ['yarn', 0],
  'run': ['yarn', 'run', 0],
  'install': ['yarn', 'install', 0],
  'frozen': ['yarn', 'install', '--frozen-lockfile'],
  'global': ['yarn', 'global', 'add', 0],
  'add': ['yarn', 'add', 0],
  'upgrade': ['yarn', 'upgrade', 0],
  'upgrade-interactive': ['yarn', 'upgrade-interactive', 0],
  'execute': ['npx', 0],
  'execute-local': ['yarn', 'exec', 0],
  'uninstall': ['yarn', 'remove', 0],
  'global_uninstall': ['yarn', 'global', 'remove', 0],
}

/** yarn 2+ */
const yarnBerry: AgentCommands = {
  ...yarn,
  'frozen': ['yarn', 'install', '--immutable'],
  'upgrade': ['yarn', 'up', 0],
  'upgrade-interactive': ['yarn', 'up', '-i', 0],
  'execute': ['yarn', 'dlx', 0],
  'execute-local': ['yarn', 'exec', 0],
  // Yarn 2+ removed 'global', see https://github.com/yarnpkg/berry/issues/821
  'global': ['npm', 'i', '-g', 0],
  'global_uninstall': ['npm', 'uninstall', '-g', 0],
}

const pnpm: AgentCommands = {
  'agent': ['pnpm', 0],
  'run': ['pnpm', 'run', 0],
  'install': ['pnpm', 'i', 0],
  'frozen': ['pnpm', 'i', '--frozen-lockfile'],
  'global': ['pnpm', 'add', '-g', 0],
  'add': ['pnpm', 'add', 0],
  'upgrade': ['pnpm', 'update', 0],
  'upgrade-interactive': ['pnpm', 'update', '-i', 0],
  'execute': ['pnpm', 'dlx', 0],
  'execute-local': ['pnpm', 'exec', 0],
  'uninstall': ['pnpm', 'remove', 0],
  'global_uninstall': ['pnpm', 'remove', '--global', 0],
}

const bun: AgentCommands = {
  'agent': ['bun', 0],
  'run': ['bun', 'run', 0],
  'install': ['bun', 'install', 0],
  'frozen': ['bun', 'install', '--frozen-lockfile'],
  'global': ['bun', 'add', '-g', 0],
  'add': ['bun', 'add', 0],
  'upgrade': ['bun', 'update', 0],
  'upgrade-interactive': ['bun', 'update', 0],
  'execute': ['bun', 'x', 0],
  'execute-local': ['bun', 'x', 0],
  'uninstall': ['bun', 'remove', 0],
  'global_uninstall': ['bun', 'remove', '-g', 0],
}

const deno: AgentCommands = {
  'agent': ['deno', 0],
  'run': ['deno', 'task', 0],
  'install': ['deno', 'install', 0],
  'frozen': ['deno', 'install', '--frozen'],
  'global': ['deno', 'install', '-g', 0],
  'add': ['deno', 'add', 0],
  'upgrade': ['deno', 'outdated', '--update', 0],
  'upgrade-interactive': ['deno', 'outdated', '--update', 0],
  'execute': denoExecute(),
  'execute-local': ['deno', 'task', '--eval', 0],
  'uninstall': ['deno', 'remove', 0],
  'global_uninstall': ['deno', 'uninstall', '-g', 0],
}

export const COMMANDS = {
  'npm': npm,
  'yarn': yarn,
  'yarn@berry': yarnBerry,
  'pnpm': pnpm,
  // pnpm v6.x or below
  'pnpm@6': <AgentCommands>{
    ...pnpm,
    run: npmRun('pnpm'),
  },
  'bun': bun,
  'deno': deno,
} satisfies Record<Agent, AgentCommands>

/**
 * Resolve the command for the agent merging the command arguments with the provided arguments.
 *
 * For example, to show how to install `@antfu/ni` globally using `pnpm`:
 * ```js
 * import { resolveCommand } from 'package-manager-detector/commands'
 * const { command, args } = resolveCommand('pnpm', 'global', ['@antfu/ni'])
 * console.log(`${command} ${args.join(' ')}`) // 'pnpm add -g @antfu/ni'
 * ```
 *
 * @param agent The agent to use.
 * @param command the command to resolve.
 * @param args The arguments to pass to the command.
 * @returns {ResolvedCommand} The resolved command or `null` if the agent command is not found.
 */
export function resolveCommand(agent: Agent, command: Command, args: string[]): ResolvedCommand | null {
  const value = COMMANDS[agent][command] as AgentCommandValue
  return constructCommand(value, args)
}

/**
 * Construct the command from the agent command merging the command arguments with the provided arguments.
 * @param value {AgentCommandValue} The agent command to use.
 * @param args The arguments to pass to the command.
 * @returns {ResolvedCommand} The resolved command or `null` if the command is `null`.
 */
export function constructCommand(value: AgentCommandValue, args: string[]): ResolvedCommand | null {
  if (value == null)
    return null

  const list = typeof value === 'function'
    ? value(args)
    : value.flatMap((v) => {
      if (typeof v === 'number')
        return args
      return [v]
    })

  return {
    command: list[0],
    args: list.slice(1),
  }
}
