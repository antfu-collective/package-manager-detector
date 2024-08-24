import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import type { Agent } from './agents'
import { AGENTS, LOCKS } from './agents'

export interface DetectOptions {
  cwd?: string
  /**
   * Callback when unknown package manager from package.json.
   *
   * @param packageManager - The `packageManager` value from package.json file.
   */
  onUnknown?: (packageManager: string) => void
}

export type { Agent }
export { AGENTS, LOCKS }

export async function detect({ cwd, onUnknown }: DetectOptions = {}) {
  let agent: Agent | undefined
  let version: string | undefined

  for (const directory of lookup(cwd)) {
    // Look up for lock files
    for (const lock of Object.keys(LOCKS)) {
      if (await fileExists(path.join(directory, lock))) {
        agent = LOCKS[lock]
        const result = await parsePackageJson(path.join(directory, 'package.json'), onUnknown)
        if (result) {
          agent = result.agent
          version = result.version
        }
        break
      }
    }
    // Look up for package.json
    const result = await parsePackageJson(path.join(directory, 'package.json'), onUnknown)
    if (result) {
      agent = result.agent
      version = result.version
      break
    }
  }

  return { agent, version }
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
) {
  // read `packageManager` field in package.json
  if (!filepath && !fs.existsSync(filepath))
    return

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
        return { agent, version }
      }
      else if (name === 'pnpm' && Number.parseInt(ver) < 7) {
        agent = 'pnpm@6'
        return { agent, version }
      }
      else if (AGENTS.includes(name)) {
        agent = name
        return { agent, version }
      }
      else {
        return onUnknown?.(pkg.packageManager)
      }
    }
  }
  catch {}
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
