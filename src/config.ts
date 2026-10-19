import type { Agent } from './types'
import { execSync } from 'node:child_process'
import process from 'node:process'

export interface ConfigFlags {
  saveExact?: boolean
}

const CONFIG_APPLICABLE_COMMANDS = ['add', 'global']

function getConfigCommand(agent: Agent): { command: string, args: string[] } | null {
  switch (agent) {
    case 'npm':
      return { command: 'npm', args: ['config', 'get', 'save-exact'] }
    case 'pnpm':
    case 'pnpm@6':
    case 'pnpm-rush':
      return { command: 'pnpm', args: ['config', 'get', 'save-exact'] }
    case 'yarn':
    case 'yarn@berry':
      return { command: 'yarn', args: ['config', 'get', 'save-exact'] }
    default:
      return null
  }
}

function configToFlag(agent: Agent, key: keyof ConfigFlags, value: any): string | null {
  if (key === 'saveExact' && value === true) {
    switch (agent) {
      case 'npm':
        return '--save-exact'
      case 'pnpm':
      case 'pnpm@6':
      case 'pnpm-rush':
        return '--save-exact'
      case 'yarn':
      case 'yarn@berry':
        return '--exact'
      default:
        return null
    }
  }
  return null
}

export function detectConfigFlags(agent: Agent, cwd?: string): ConfigFlags {
  const configCmd = getConfigCommand(agent)
  if (!configCmd)
    return {}

  const flags: ConfigFlags = {}
  try {
    const result = execSync(`${configCmd.command} ${configCmd.args.join(' ')}`, {
      cwd: cwd || process.cwd(),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5000,
    }).trim()
    if (result === 'true') {
      flags.saveExact = true
    }
  }
  catch {}
  return flags
}
export function getConfigFlags(agent: Agent, command: string, cwd?: string): string[] {
  if (!CONFIG_APPLICABLE_COMMANDS.includes(command))
    return []
  const configFlags = detectConfigFlags(agent, cwd)
  const cliFlags: string[] = []
  for (const [key, value] of Object.entries(configFlags)) {
    const flag = configToFlag(agent, key as keyof ConfigFlags, value)
    if (flag)
      cliFlags.push(flag)
  }
  return cliFlags
}
