import type { Agent, AgentName } from './types'

export const AGENTS: Agent[] = [
  'npm',
  'yarn',
  'yarn@berry',
  'pnpm',
  'pnpm@6',
  'bun',
  'deno',
]

// the order here matters, more specific one comes first
export const LOCKS: Record<string, AgentName> = {
  'bun.lock': 'bun',
  'bun.lockb': 'bun',
  'deno.lock': 'deno',
  'pnpm-lock.yaml': 'pnpm',
  'yarn.lock': 'yarn',
  'package-lock.json': 'npm',
  'npm-shrinkwrap.json': 'npm',
}

// the order here matters, more specific one comes first
export const INSTALL_METADATAS: Record<string, AgentName> = {
  'node_modules/.deno/': 'deno',
  'node_modules/.pnpm/': 'pnpm',
  'node_modules/.yarn-state.yml': 'yarn', // yarn v2+ (node-modules)
  'node_modules/.yarn_integrity': 'yarn', // yarn v1
  'node_modules/.package-lock.json': 'npm',
  '.pnp.cjs': 'yarn', // yarn v3+ (pnp)
  '.pnp.js': 'yarn', // yarn v2 (pnp)
  'bun.lock': 'bun',
  'bun.lockb': 'bun',
}

export const INSTALL_PAGE: Record<Agent, string> = {
  'bun': 'https://bun.sh',
  'deno': 'https://deno.com',
  'pnpm': 'https://pnpm.io/installation',
  'pnpm@6': 'https://pnpm.io/6.x/installation',
  'yarn': 'https://classic.yarnpkg.com/en/docs/install',
  'yarn@berry': 'https://yarnpkg.com/getting-started/install',
  'npm': 'https://docs.npmjs.com/cli/v8/configuring-npm/install',
}
