import type { Agent, AgentName, DetectOptions, DetectResult } from './types'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { AGENTS, LOCKS } from './constants'

async function isFile(path: string) {
  try {
    return (await fs.promises.stat(path)).isFile()
  }
  catch {
    return false
  }
}

/**
 * Detects the package manager used in the running process.
 *
 * This method will check for `process.env.npm_config_user_agent`.
 */
export function getUserAgent(): AgentName | null {
  const userAgent = process.env.npm_config_user_agent
  if (!userAgent) {
    return null
  }

  const name = userAgent.split('/')[0] as AgentName
  return AGENTS.includes(name) ? name : null
}

function * lookup(cwd: string = process.cwd()): Generator<string> {
  let directory = path.resolve(cwd)
  const { root } = path.parse(directory)

  while (directory && directory !== root) {
    yield directory

    directory = path.dirname(directory)
  }
}

async function parsePackageJson(filepath: string, onUnknown: DetectOptions['onUnknown']): Promise<DetectResult | null> {
  return (!filepath || !await isFile(filepath))
    ? null
    : await handlePackageManager(filepath, onUnknown)
}

/**
 * Detects the package manager used in the project.
 * @param options {DetectOptions} The options to use when detecting the package manager.
 * @returns {Promise<DetectResult | null>} The detected package manager or `null` if not found.
 */
export async function detect(options: DetectOptions = {}): Promise<DetectResult | null> {
  const { cwd, onUnknown } = options

  for (const directory of lookup(cwd)) {
    // Look up for lock files
    for (const lock of Object.keys(LOCKS)) {
      if (await isFile(path.join(directory, lock))) {
        const name = LOCKS[lock]
        const result = await parsePackageJson(path.join(directory, 'package.json'), onUnknown)
        if (result)
          return result
        else
          return { name, agent: name }
      }
    }
    // Look up for package.json
    const result = await parsePackageJson(path.join(directory, 'package.json'), onUnknown)
    if (result)
      return result
  }

  return null
}

async function handlePackageManager(
  filepath: string,
  onUnknown: DetectOptions['onUnknown'],
) {
  // read `packageManager` field in package.json
  try {
    const pkg = JSON.parse(await fs.promises.readFile(filepath, 'utf8'))
    let agent: Agent | undefined
    if (typeof pkg.packageManager === 'string') {
      const [name, ver] = pkg.packageManager.replace(/^\^/, '').split('@')
      let version = ver
      if (name === 'yarn' && Number.parseInt(ver) > 1) {
        agent = 'yarn@berry'
        // the version in packageManager isn't the actual yarn package version
        version = 'berry'
        return { name, agent, version }
      }
      else if (name === 'pnpm' && Number.parseInt(ver) < 7) {
        agent = 'pnpm@6'
        return { name, agent, version }
      }
      else if (AGENTS.includes(name)) {
        agent = name as Agent
        return { name, agent, version }
      }
      else {
        return onUnknown?.(pkg.packageManager) ?? null
      }
    }
  }
  catch {}
  return null
}
