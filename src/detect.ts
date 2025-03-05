import type { Agent, AgentName, DetectOptions, DetectResult } from './types'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { QuansyncFn } from 'quansync'
import { quansync } from 'quansync/macro'
import { AGENTS, INSTALL_METADATAS, LOCKS } from './constants'

const pathExists = quansync({
  sync: (path: string, type: 'file' | 'dir') => {
    try {
      const stat = fs.statSync(path)
      return type === 'file' ? stat.isFile() : stat.isDirectory()
    }
    catch {
      return false
    }
  },
  async: async (path: string, type: 'file' | 'dir') => {
    try {
      const stat = await fs.promises.stat(path)
      return type === 'file' ? stat.isFile() : stat.isDirectory()
    }
    catch {
      return false
    }
  },
})

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

const parsePackageJson = quansync(async (
  filepath: string,
  onUnknown: DetectOptions['onUnknown'],
): Promise<DetectResult | null> => {
  return !filepath || !await pathExists(filepath, 'file') ? null : handlePackageManager(filepath, onUnknown)
})

/**
 * Detects the package manager used in the project.
 * @param options {DetectOptions} The options to use when detecting the package manager.
 * @returns {Promise<DetectResult | null>} The detected package manager or `null` if not found.
 */
export const detect = quansync(async (options: DetectOptions = {}): Promise<DetectResult | null> => {
  const { cwd, strategies = ['lockfile', 'packageManager'], onUnknown } = options

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
        case 'packageManager': {
          // Look up for package.json
          const result = await parsePackageJson(path.join(directory, 'package.json'), onUnknown)
          if (result)
            return result
          break
        }
        case 'node_modules': {
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
          break
        }
      }
    }
  }

  return null
})
export const detectSync = detect.sync

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
