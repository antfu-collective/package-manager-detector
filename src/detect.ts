import type { Agent, AgentName, DetectOptions, DetectResult } from './types'
import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { AGENTS, INSTALL_METADATAS, LOCKS } from './constants'

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
      if (await pathExists(path.join(directory, lock), 'file')) {
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
 * @param options {DetectOptions} The options to use when detecting the package manager.
 * @returns {DetectResult | null>} The detected package manager or `null` if not found.
 */
export function detectSync(options: DetectOptions = {}): DetectResult | null {
  const { cwd, onUnknown } = options

  for (const directory of lookup(cwd)) {
    // Look up for lock files
    for (const lock of Object.keys(LOCKS)) {
      if (pathExistsSync(path.join(directory, lock), 'file')) {
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

/**
 * Detects the package manager used for installation in the project.
 * @param options {DetectOptions} The options to use when detecting the package manager.
 * @returns {Promise<DetectResult | null>} The detected package manager or `null` if not found.
 */
export async function detectInstall(options: DetectOptions = {}): Promise<DetectResult | null> {
  const { cwd, onUnknown } = options

  for (const directory of lookup(cwd)) {
    // Look up for installation metadata files
    for (const metadata of Object.keys(INSTALL_METADATAS)) {
      const fileOrDir = metadata.endsWith('/') ? 'dir' : 'file'
      if (await pathExists(path.join(directory, metadata), fileOrDir)) {
        const name = INSTALL_METADATAS[metadata]
        const agent = name === 'yarn'
          ? isMetadataYarnClassic(metadata) ? 'yarn' : 'yarn@berry'
          : name
        return { name, agent }
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
 * Detects the package manager used for installation in the project.
 * @param options {DetectOptions} The options to use when detecting the package manager.
 * @returns {DetectResult | null} The detected package manager or `null` if not found.
 */
export function detectInstallSync(options: DetectOptions = {}): DetectResult | null {
  const { cwd, onUnknown } = options

  for (const directory of lookup(cwd)) {
    // Look up for installation metadata files
    for (const metadata of Object.keys(INSTALL_METADATAS)) {
      const fileOrDir = metadata.endsWith('/') ? 'dir' : 'file'
      if (pathExistsSync(path.join(directory, metadata), fileOrDir)) {
        const name = INSTALL_METADATAS[metadata]
        const agent = name === 'yarn'
          ? isMetadataYarnClassic(metadata) ? 'yarn' : 'yarn@berry'
          : name
        return { name, agent }
      }
    }
    // Look up for package.json
    const result = parsePackageJsonSync(path.join(directory, 'package.json'), onUnknown)
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

async function parsePackageJson(
  filepath: string,
  onUnknown: DetectOptions['onUnknown'],
): Promise<DetectResult | null> {
  return !filepath || !await pathExists(filepath, 'file') ? null : handlePackageManager(filepath, onUnknown)
}

function parsePackageJsonSync(
  filepath: string,
  onUnknown: DetectOptions['onUnknown'],
): DetectResult | null {
  return !filepath || !pathExistsSync(filepath, 'file') ? null : handlePackageManager(filepath, onUnknown)
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

function isMetadataYarnClassic(metadataPath: string) {
  return metadataPath.endsWith('.yarn_integrity')
}

async function pathExists(filePath: string, type: 'file' | 'dir') {
  try {
    const stats = await fsPromises.stat(filePath)
    if (type === 'file' ? stats.isFile() : stats.isDirectory()) {
      return true
    }
  }
  catch {}
  return false
}

function pathExistsSync(filePath: string, type: 'file' | 'dir') {
  try {
    const stats = fs.statSync(filePath)
    if (type === 'file' ? stats.isFile() : stats.isDirectory()) {
      return true
    }
  }
  catch {}
  return false
}
