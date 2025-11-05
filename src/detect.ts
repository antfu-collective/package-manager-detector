import type { Agent, AgentName, DetectOptions, DetectResult } from './types'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import stripJsonComments from 'strip-json-comments'
import { AGENTS, INSTALL_METADATA, LOCKS } from './constants'

async function pathExists(path: string, type: 'file' | 'dir') {
  try {
    const stat = await fs.stat(path)
    return type === 'file' ? stat.isFile() : stat.isDirectory()
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

function* lookup(cwd: string = process.cwd()): Generator<string> {
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
  return (!filepath || !pathExists(filepath, 'file'))
    ? null
    : await handlePackageManager(filepath, onUnknown)
}

/**
 * Detects the package manager used in the project.
 * @param options {DetectOptions} The options to use when detecting the package manager.
 * @returns {Promise<DetectResult | null>} The detected package manager or `null` if not found.
 */
export async function detect(options: DetectOptions = {}): Promise<DetectResult | null> {
  const {
    cwd,
    strategies = ['lockfile', 'packageManager-field', 'devEngines-field'],
    onUnknown,
  } = options

  let stopDir: ((dir: string) => boolean) | undefined
  if (typeof options.stopDir === 'string') {
    const resolved = path.resolve(options.stopDir)
    stopDir = dir => dir === resolved
  }
  else {
    stopDir = options.stopDir
  }

  for (const directory of lookup(cwd)) {
    for (const strategy of strategies) {
      switch (strategy) {
        case 'lockfile': {
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
          break
        }
        case 'packageManager-field':
        case 'devEngines-field': {
          // Look up for package.json
          const result = await parsePackageJson(path.join(directory, 'package.json'), onUnknown)
          if (result)
            return result
          break
        }
        case 'install-metadata': {
          // Look up for installation metadata files
          for (const metadata of Object.keys(INSTALL_METADATA)) {
            const fileOrDir = metadata.endsWith('/') ? 'dir' : 'file'
            if (await pathExists(path.join(directory, metadata), fileOrDir)) {
              const name = INSTALL_METADATA[metadata]
              const agent = name === 'yarn'
                ? isMetadataYarnClassic(metadata) ? 'yarn' : 'yarn@berry'
                : name
              return { name, agent }
            }
          }
          break
        }
      }
    }

    // Stop the traversing if the stop directory is reached
    if (stopDir?.(directory))
      break
  }

  return null
}

function getNameAndVer(pkg: { packageManager?: string, devEngines?: { packageManager?: { name?: string, version?: string } } }) {
  const handelVer = (version: string | undefined) => version?.match(/\d+(\.\d+){0,2}/)?.[0] ?? version
  if (typeof pkg.packageManager === 'string') {
    const [name, ver] = pkg.packageManager.replace(/^\^/, '').split('@')
    return { name, ver: handelVer(ver) }
  }
  if (typeof pkg.devEngines?.packageManager?.name === 'string') {
    return {
      name: pkg.devEngines.packageManager.name,
      ver: handelVer(pkg.devEngines.packageManager.version),
    }
  }
  return undefined
}

async function handlePackageManager(
  filepath: string,
  onUnknown: DetectOptions['onUnknown'],
) {
  // read `packageManager` field in package.json
  try {
    const jsonString = await fs.readFile(filepath, 'utf8')
    /**
     * https://bun.com/blog/bun-v1.1.5#package-json-with-comments-and-trailing-commas
     * Bun allows comments and trailing commas in package.json, so we need to strip them before parsing.
     */
    const cleanJsonString = stripJsonComments(jsonString, { trailingCommas: true })
    const pkg = JSON.parse(cleanJsonString)

    let agent: Agent | undefined
    const nameAndVer = getNameAndVer(pkg)
    if (nameAndVer) {
      const name = nameAndVer.name as AgentName
      const ver = nameAndVer.ver
      let version = ver
      if (name === 'yarn' && ver && Number.parseInt(ver) > 1) {
        agent = 'yarn@berry'
        // the version in packageManager isn't the actual yarn package version
        version = 'berry'
        return { name, agent, version }
      }
      else if (name === 'pnpm' && ver && Number.parseInt(ver) < 7) {
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
  catch { }
  return null
}

function isMetadataYarnClassic(metadataPath: string) {
  return metadataPath.endsWith('.yarn_integrity')
}
