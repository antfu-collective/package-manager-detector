import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import type { Agent } from './types'
import { AGENTS, LOCKS } from './agents'

export * from './types'

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

  const lockPath = await findUp(Object.keys(LOCKS), { cwd })
  let packageJsonPath: string | undefined

  if (lockPath)
    packageJsonPath = path.resolve(lockPath, '../package.json')
  else
    packageJsonPath = await findUp('package.json', { cwd })

  // read `packageManager` field in package.json
  if (packageJsonPath && fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
      if (typeof pkg.packageManager === 'string') {
        const [name, ver] = pkg.packageManager.replace(/^\^/, '').split('@')
        version = ver
        if (name === 'yarn' && Number.parseInt(ver) > 1) {
          agent = 'yarn@berry'
          // the version in packageManager isn't the actual yarn package version
          version = 'berry'
        }
        else if (name === 'pnpm' && Number.parseInt(ver) < 7) {
          agent = 'pnpm@6'
        }
        else if (AGENTS.includes(name)) {
          agent = name
        }
        else {
          onUnknown?.(pkg.packageManager)
        }
      }
    }
    catch {}
  }

  // detect based on lock
  if (!agent && lockPath)
    agent = LOCKS[path.basename(lockPath)]

  return { agent, version }
}

async function findUp(name: string | string[], { cwd }: {
  cwd: string | undefined
}) {
  let directory = path.resolve(cwd ?? process.cwd())
  const { root } = path.parse(directory)
  const names = [name].flat()

  while (directory && directory !== root) {
    for (const name of names) {
      const filePath = path.join(directory, name)

      try {
        const stats = await fsPromises.stat(filePath)
        if (stats.isFile()) {
          return filePath
        }
      }
      catch {}
    }

    directory = path.dirname(directory)
  }
}
