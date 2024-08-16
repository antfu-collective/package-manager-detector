export const AGENTS = ['npm', 'yarn', 'yarn@berry', 'pnpm', 'pnpm@6', 'bun'] as const
export type Agent = typeof AGENTS[number]

// the order here matters, more specific one comes first
export const LOCKS: Record<string, Agent> = {
  'bun.lockb': 'bun',
  'pnpm-lock.yaml': 'pnpm',
  'yarn.lock': 'yarn',
  'package-lock.json': 'npm',
  'npm-shrinkwrap.json': 'npm',
}

function npmRun(agent: string) {
  return (args: string[]) => {
    if (args.length > 1)
      return `${agent} run ${args[0]} -- ${args.slice(1).join(' ')}`
    else return `${agent} run ${args[0]}`
  }
}

const yarn = {
  'agent': 'yarn {0}',
  'run': 'yarn run {0}',
  'install': 'yarn install {0}',
  'frozen': 'yarn install --frozen-lockfile',
  'global': 'yarn global add {0}',
  'add': 'yarn add {0}',
  'upgrade': 'yarn upgrade {0}',
  'upgrade-interactive': 'yarn upgrade-interactive {0}',
  'execute': 'npx {0}',
  'uninstall': 'yarn remove {0}',
  'global_uninstall': 'yarn global remove {0}',
}
const pnpm = {
  'agent': 'pnpm {0}',
  'run': 'pnpm run {0}',
  'install': 'pnpm i {0}',
  'frozen': 'pnpm i --frozen-lockfile',
  'global': 'pnpm add -g {0}',
  'add': 'pnpm add {0}',
  'upgrade': 'pnpm update {0}',
  'upgrade-interactive': 'pnpm update -i {0}',
  'execute': 'pnpm dlx {0}',
  'uninstall': 'pnpm remove {0}',
  'global_uninstall': 'pnpm remove --global {0}',
}
const bun = {
  'agent': 'bun {0}',
  'run': 'bun run {0}',
  'install': 'bun install {0}',
  'frozen': 'bun install --frozen-lockfile',
  'global': 'bun add -g {0}',
  'add': 'bun add {0}',
  'upgrade': 'bun update {0}',
  'upgrade-interactive': 'bun update {0}',
  'execute': 'bun x {0}',
  'uninstall': 'bun remove {0}',
  'global_uninstall': 'bun remove -g {0}',
}

export const COMMANDS = {
  'npm': {
    'agent': 'npm {0}',
    'run': npmRun('npm'),
    'install': 'npm i {0}',
    'frozen': 'npm ci',
    'global': 'npm i -g {0}',
    'add': 'npm i {0}',
    'upgrade': 'npm update {0}',
    'upgrade-interactive': null,
    'execute': 'npx {0}',
    'uninstall': 'npm uninstall {0}',
    'global_uninstall': 'npm uninstall -g {0}',
  },
  'yarn': yarn,
  'yarn@berry': {
    ...yarn,
    'frozen': 'yarn install --immutable',
    'upgrade': 'yarn up {0}',
    'upgrade-interactive': 'yarn up -i {0}',
    'execute': 'yarn dlx {0}',
    // Yarn 2+ removed 'global', see https://github.com/yarnpkg/berry/issues/821
    'global': 'npm i -g {0}',
    'global_uninstall': 'npm uninstall -g {0}',
  },
  'pnpm': pnpm,
  // pnpm v6.x or below
  'pnpm@6': {
    ...pnpm,
    run: npmRun('pnpm'),
  },
  'bun': bun,
}

export type Command = keyof typeof COMMANDS.npm

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

function npmRunCommand(agent: string) {
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
  const interactive = commands['upgrade-interactive'] as string | null
  return {
    'agent': commands.agent,
    'run': typeof commands.run === 'function'
      ? npmRunCommand(agent.includes('@') ? agent.split('@')[0] : agent)
      : buildCommand(commands.run as string),
    'install': buildCommand(commands.install),
    'frozen': buildCommand(commands.frozen),
    'global': buildCommand(commands.global),
    'add': buildCommand(commands.add),
    'upgrade': buildCommand(commands.upgrade),
    'upgrade-interactive': interactive ? buildCommand(interactive) : null,
    'execute': buildCommand(commands.execute),
    'uninstall': buildCommand(commands.uninstall),
    'global_uninstall': buildCommand(commands.global_uninstall),
  } satisfies AgentCommand
}

export const AGENT_COMMANDS = Object.entries(COMMANDS)
  .map(([pm, commands]) => [pm, buildCommands(pm as Agent, commands as any)] as const)
  .reduce((acc, [pm, commands]) => {
    acc[pm as Agent] = commands
    return acc
  }, {} as Record<Agent, ReturnType<typeof buildCommands>>)

export const INSTALL_PAGE: Record<Agent, string> = {
  'bun': 'https://bun.sh',
  'pnpm': 'https://pnpm.io/installation',
  'pnpm@6': 'https://pnpm.io/6.x/installation',
  'yarn': 'https://classic.yarnpkg.com/en/docs/install',
  'yarn@berry': 'https://yarnpkg.com/getting-started/install',
  'npm': 'https://docs.npmjs.com/cli/v8/configuring-npm/install',
}
