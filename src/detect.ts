import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import type { Agent, DetectOptions, DetectResult } from './types'
import { AGENTS, LOCKS } from './constants'

/**
 * Detects the package manager used in the project.
 *
 * @param options {DetectOptions} The options to use when detecting the package manager.
 *
 * @returns {Promise<DetectResult | null>} The detected package manager or `null` if not found.
 */
export async function detect(options: DetectOptions = {}): Promise<DetectResult | null> {
  const { cwd, onUnknown } = options
  for (const directory of lookup(cwd)) {
    // Look up for lock files
    for (const lock of Object.keys(LOCKS)) {
      if (await fileExists(path.join(directory, lock))) {
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

/**
 * Detects the package manager used in the project.
 *
 * @param options {DetectOptions} The options to use when detecting the package manager.
 *
 * @returns {DetectResult | null>} The detected package manager or `null` if not found.
 */
export function detectSync(options: DetectOptions = {}): DetectResult | null {
  const { cwd, onUnknown } = options
  for (const directory of lookup(cwd)) {
    // Look up for lock files
    for (const lock of Object.keys(LOCKS)) {
      if (fileExistsSync(path.join(directory, lock))) {
        const name = LOCKS[lock]
        const result = parsePackageJsonSync(path.join(directory, 'package.json'), onUnknown)
        if (result)
          return result
        else
          return { name, agent: name }
      }
    }
    // Look up for package.json
    const result = parsePackageJsonSync(path.join(directory, 'package.json'), onUnknown)
    if (result)
      return result
  }

  return null
}

function * lookup(cwd: string = process.cwd()): Generator<string> {
  let directory = path.resolve(cwd)
  const { root } = path.parse(directory)

  while (directory && directory !== root) {
    yield directory

    directory = path.dirname(directory)
  }
}

async function parsePackageJson(
  filepath: string,
  onUnknown: DetectOptions['onUnknown'],
): Promise<DetectResult | null> {
  return !filepath || !await fileExists(filepath) ? null : handlePackageManager(filepath, onUnknown)
}

function parsePackageJsonSync(
  filepath: string,
  onUnknown: DetectOptions['onUnknown'],
): DetectResult | null {
  return !filepath || !fileExistsSync(filepath) ? null : handlePackageManager(filepath, onUnknown)
}

function handlePackageManager(
  filepath: string,
  onUnknown: DetectOptions['onUnknown'],
) {
  // read `packageManager` field in package.json
  try {
    const pkg = JSON.parse(fs.readFileSync(filepath, 'utf8'))
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
