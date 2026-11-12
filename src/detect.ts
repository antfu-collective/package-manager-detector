import type { Agent, AgentName, DetectOptions, DetectResult, DetectStrategy, StrategyContext } from './types'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
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

async function readPackageJson(
  filepath: string,
  options: DetectOptions,
): Promise<Record<string, any> | null> {
  if (!(await pathExists(filepath, 'file')))
    return null

  try {
    const content = await fs.readFile(filepath, 'utf8')
    return options.packageJsonParser
      ? await options.packageJsonParser(content, filepath)
      : JSON.parse(content)
  }
  catch {
    return null
  }
}

function resolvePackageManagerField(
  pkg: Record<string, any>,
  options: DetectOptions,
): DetectResult | null {
  const raw = pkg.packageManager
  if (typeof raw !== 'string')
    return null

  const [name, ver] = raw.replace(/^\^/, '').split('@')
  return resolveAgent(name as AgentName, normalizeAgentVersion(ver))
    ?? options.onUnknown?.(raw)
    ?? null
}

function resolveDevEnginesField(
  pkg: Record<string, any>,
  options: DetectOptions,
): DetectResult | null {
  const devEngines = pkg.devEngines?.packageManager
  if (typeof devEngines?.name !== 'string')
    return null

  return resolveAgent(devEngines.name as AgentName, normalizeAgentVersion(devEngines.version))
    ?? options.onUnknown?.(devEngines.name)
    ?? null
}

/**
 * The default detection strategies, in the order they run for every directory.
 *
 * The `package.json` fields come before lock files on purpose: when a project
 * both has a lock file and declares `packageManager`, the field carries the
 * version needed to resolve the right agent (e.g. `yarn@berry`). Lock files
 * stay the fallback for projects that don't declare anything.
 */
export const DEFAULT_STRATEGIES: DetectStrategy[] = [
  'rush',
  'packageManager-field',
  'devEngines-field',
  'lockfile',
]

/**
 * Detects the package manager used in the project.
 * @param options {DetectOptions} The options to use when detecting the package manager.
 * @returns {Promise<DetectResult | null>} The detected package manager or `null` if not found.
 */
export async function detect(options: DetectOptions = {}): Promise<DetectResult | null> {
  const {
    cwd,
    strategies = DEFAULT_STRATEGIES,
  } = options

  const startDir = path.resolve(cwd ?? process.cwd())

  let stopDir: ((dir: string) => boolean) | undefined
  if (typeof options.stopDir === 'string') {
    const resolved = path.resolve(options.stopDir)
    stopDir = dir => dir === resolved
  }
  else {
    stopDir = options.stopDir
  }

  for (const directory of lookup(startDir)) {
    // The two `package.json`-based strategies share one read per directory.
    let packageJson: Promise<Record<string, any> | null> | undefined
    const readPackageJsonAtDirectory = () =>
      (packageJson ??= readPackageJson(path.join(directory, 'package.json'), options))

    let stopRequested = false
    const context: StrategyContext = {
      directory,
      cwd: startDir,
      options,
      pathExists,
      stop: () => {
        stopRequested = true
      },
    }

    for (const strategy of strategies) {
      if (typeof strategy === 'function') {
        const result = await strategy(context)
        if (result)
          return result
        continue
      }

      switch (strategy) {
        case 'rush': {
          // Rush monorepos wrap pnpm with `rush-pnpm`.
          if (await pathExists(path.join(directory, 'rush.json'), 'file'))
            return { name: 'pnpm', agent: 'pnpm-rush' }
          break
        }
        case 'packageManager-field': {
          const pkg = await readPackageJsonAtDirectory()
          if (pkg) {
            const result = resolvePackageManagerField(pkg, options)
            if (result)
              return result
          }
          break
        }
        case 'devEngines-field': {
          const pkg = await readPackageJsonAtDirectory()
          if (pkg) {
            const result = resolveDevEnginesField(pkg, options)
            if (result)
              return result
          }
          break
        }
        case 'lockfile': {
          // Look up for lock files
          for (const lock of Object.keys(LOCKS)) {
            if (await pathExists(path.join(directory, lock), 'file')) {
              const name = LOCKS[lock]
              return { name, agent: name }
            }
          }
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

    // Stop the traversing if a strategy asked for it or the stop directory is reached
    if (stopRequested || stopDir?.(directory))
      break
  }

  return null
}

/**
 * Extracts the `major[.minor[.patch]]` part of a version string, e.g. `^9.12.1+sha512.abc` becomes `9.12.1`.
 * @param version The raw version, as found in `packageManager` or `devEngines.packageManager.version`.
 * @returns The extracted version, or the input unchanged if it contains no numeric version.
 */
export function normalizeAgentVersion(version: string | undefined): string | undefined {
  return version?.match(/\d+(\.\d+){0,2}/)?.[0] ?? version
}

/**
 * Resolves the agent for a package manager name and version, e.g. to pass to `resolveCommand` without running `detect`.
 *
 * Yarn above v1 resolves to `yarn@berry` (with version `berry`) and pnpm below v7 to `pnpm@6`.
 * @param name The package manager name.
 * @param ver The package manager version, see `normalizeAgentVersion`.
 * @returns The resolved name, agent and version, or `undefined` if the name is not a known agent.
 */
export function resolveAgent(name: AgentName, ver?: string) {
  let agent: Agent | undefined
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
}

function isMetadataYarnClassic(metadataPath: string) {
  return metadataPath.endsWith('.yarn_integrity')
}
