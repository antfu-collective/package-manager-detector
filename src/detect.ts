import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import type { Agent, AgentName, DetectOptions, DetectResult } from './types'
import { AGENTS, LOCKS } from './constants'

/**
 * Detects the package manager used in the project.
 * @param options {DetectOptions} The options to use when detecting the package manager.
 * @returns {Promise<DetectResult | null>} The detected package manager or `null` if not found.
 */
export async function detect(options: DetectOptions = {}): Promise<DetectResult | null> {
  const { cwd, onUnknown } = options

  for (const directory of lookup(cwd)) {
    const pkg = await parsePackageJson(path.join(directory, 'package.json'))
    // Look for lock files
    for (const lock of Object.keys(LOCKS)) {
      if (await fileExists(path.join(directory, lock))) {
        const name = LOCKS[lock]
        const result = getFromPackageManagerField(pkg, onUnknown)
        if (result)
          return result
        else
          return { name, agent: name }
      }
    }
    // Look in package.json
    const result = getFromPackageManagerField(pkg, onUnknown)
    if (result)
      return result
  }

  return null
}

/**
 * Detects the package manager used in the project.
 * @param options {DetectOptions} The options to use when detecting the package manager.
 * @returns {DetectResult | null>} The detected package manager or `null` if not found.
 */
export function detectSync(options: DetectOptions = {}): DetectResult | null {
  const { cwd, onUnknown } = options

  for (const directory of lookup(cwd)) {
    const pkg = parsePackageJsonSync(path.join(directory, 'package.json'))
    // Look for lock files
    for (const lock of Object.keys(LOCKS)) {
      if (fileExistsSync(path.join(directory, lock))) {
        const name = LOCKS[lock]
        const result = getFromPackageManagerField(pkg, onUnknown)
        if (result)
          return result
        else
          return { name, agent: name }
      }
    }
    // Look in package.json
    const result = getFromPackageManagerField(pkg, onUnknown)
    if (result)
      return result
  }

  return null
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

async function parsePackageJson(filepath: string): Promise<any> {
  if (!filepath || !await fileExists(filepath)) {
    return null
  }
  return JSON.parse(await fsPromises.readFile(filepath, 'utf8'))
}

function parsePackageJsonSync(filepath: string): any | null {
  if (!filepath || !fileExists(filepath)) {
    return null
  }
  return JSON.parse(fs.readFileSync(filepath, 'utf8'))
}

function getFromPackageManagerField(
  pkg: any,
  onUnknown: DetectOptions['onUnknown'],
) {
  // read `packageManager` field in package.json
  try {
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

async function fileExists(filePath: string) {
  try {
    const stats = await fsPromises.stat(filePath)
    if (stats.isFile()) {
      return true
    }
  }
  catch {}
  return false
}

function fileExistsSync(filePath: string) {
  try {
    const stats = fs.statSync(filePath)
    if (stats.isFile()) {
      return true
    }
  }
  catch {}
  return false
}
