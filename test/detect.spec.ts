import type { MockInstance } from 'vitest'
import type { DetectOptions } from '../src'
import { tmpdir } from 'node:os'
import path from 'node:path'
import fs from 'fs-extra'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { detect, getWorkspaceRoot } from '../src'

let basicLog: MockInstance, errorLog: MockInstance, warnLog: MockInstance, infoLog: MockInstance

function detectTest(fixture: string, agent: string, options?: DetectOptions) {
  return async () => {
    const cwd = await fs.mkdtemp(path.join(tmpdir(), 'ni-'))
    const dir = path.join(__dirname, 'fixtures', fixture, agent)
    await fs.copy(dir, cwd)

    expect(await detect({ cwd, ...options })).toMatchSnapshot()
  }
}

beforeAll(() => {
  basicLog = vi.spyOn(console, 'log')
  warnLog = vi.spyOn(console, 'warn')
  errorLog = vi.spyOn(console, 'error')
  infoLog = vi.spyOn(console, 'info')
})

afterAll(() => {
  vi.resetAllMocks()
})

const fixtures = ['lockfile', 'packager', 'dev-engines', 'install-metadata']

fixtures.forEach(fixture => describe(fixture, () => {
  const fixtureDirs = getFixtureDirs(fixture)

  fixtureDirs.forEach((dir) => {
    let options: DetectOptions | undefined
    if (fixture === 'install-metadata') {
      options = { strategies: ['install-metadata', 'lockfile', 'packageManager-field', 'devEngines-field'] }
    }
    it(dir, detectTest(fixture, dir, options))
  })

  it('no logs', () => {
    expect(basicLog).not.toHaveBeenCalled()
    expect(warnLog).not.toHaveBeenCalled()
    expect(errorLog).not.toHaveBeenCalled()
    expect(infoLog).not.toHaveBeenCalled()
  })
}))

function getFixtureDirs(fixture: string) {
  const fixtureDir = path.join(__dirname, 'fixtures', fixture)
  const items = fs.readdirSync(fixtureDir)
  return items.filter(item => fs.statSync(path.join(fixtureDir, item)).isDirectory())
}

it('stops at specified directory', async () => {
  const cwd = await fs.mkdtemp(path.join(tmpdir(), 'ni-'))

  const noFilesDir = path.join(cwd, 'no-files')
  const nestedNoFilesDir = path.join(noFilesDir, 'nested')
  const parentDir = cwd

  await fs.mkdirp(noFilesDir)
  await fs.mkdirp(nestedNoFilesDir)

  await fs.copy(
    path.join(__dirname, 'fixtures', 'lockfile', 'npm'),
    parentDir,
  )

  const resultWithStop = await detect({
    cwd: nestedNoFilesDir,
    stop: noFilesDir,
  })

  expect(resultWithStop).toBe(null)

  const resultWithoutStop = await detect({
    cwd: nestedNoFilesDir,
  })

  expect(resultWithoutStop).toMatchObject({
    name: 'npm',
    agent: 'npm',
  })
})

it('detects pnpm workspace root', async () => {
  const cwd = await fs.mkdtemp(path.join(tmpdir(), 'ni-'))

  // setup a pnpm workspace structure
  const workspaceDir = path.join(cwd, 'workspace')
  const packageDir = path.join(workspaceDir, 'packages', 'foo')

  await fs.copy(
    path.join(__dirname, 'fixtures', 'workspace', 'pnpm'),
    workspaceDir,
  )

  // should find workspace root from package directory
  const rootFromPackage = await getWorkspaceRoot(packageDir)
  expect(rootFromPackage).toBe(workspaceDir)

  // should find workspace root from workspace directory
  const rootFromWorkspace = await getWorkspaceRoot(workspaceDir)
  expect(rootFromWorkspace).toBe(workspaceDir)

  // should return null when no workspace root
  const rootFromOutside = await getWorkspaceRoot(cwd)
  expect(rootFromOutside).toBe(null)
})
