import fs from 'node:fs'
import path from 'node:path'
import { findUp } from 'find-up'
import type { Agent } from './agents'
import { AGENTS, LOCKS } from './agents'

export interface DetectOptions {
  cwd?: string
}

export * from './agents'

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
        else if (name in AGENTS) {
          agent = name
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
