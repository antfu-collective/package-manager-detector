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
