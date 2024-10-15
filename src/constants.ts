import type { Agent, AgentName } from './types'

export const AGENTS: Agent[] = [
  'npm',
  'yarn',
  'yarn@berry',
  'pnpm',
  'pnpm@6',
  'bun',
]

// the order here matters, more specific one comes first
export const WORKSPACE_DEFS: Record<string, AgentName> = {
  'pnpm-lock.yaml': 'pnpm',
}

// the order here matters, more specific one comes first
export const LOCKS: Record<string, AgentName> = {
  'bun.lockb': 'bun',
  'pnpm-lock.yaml': 'pnpm',
  'yarn.lock': 'yarn',
  'package-lock.json': 'npm',
  'npm-shrinkwrap.json': 'npm',
}

export const INSTALL_PAGE: Record<Agent, string> = {
  'bun': 'https://bun.sh',
  'pnpm': 'https://pnpm.io/installation',
  'pnpm@6': 'https://pnpm.io/6.x/installation',
  'yarn': 'https://classic.yarnpkg.com/en/docs/install',
  'yarn@berry': 'https://yarnpkg.com/getting-started/install',
  'npm': 'https://docs.npmjs.com/cli/v8/configuring-npm/install',
}
