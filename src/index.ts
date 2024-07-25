import fs from 'node:fs'
import path from 'node:path'
import { findUp } from 'find-up'
import type { Agent } from './utils'
import { AGENTS, LOCKS } from './utils'

export interface DetectOptions {
  cwd?: string
}

export type { Agent }
export { AGENTS, LOCKS }

export async function detect({ cwd }: DetectOptions = {}) {
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
      }
    }
    catch (e) {
      console.error('WTF', e)
    }
  }

  // detect based on lock
  if (!agent && lockPath)
    agent = LOCKS[path.basename(lockPath)]

  return { agent, version }
}
