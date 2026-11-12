import type { MockInstance } from 'vitest'
import type { DetectOptions } from '../src'
import { readdirSync, statSync } from 'node:fs'
import { cp, mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { detect } from '../src'

let basicLog: MockInstance, errorLog: MockInstance, warnLog: MockInstance, infoLog: MockInstance

function detectTest(fixture: string, agent: string, options?: DetectOptions) {
  return async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'ni-'))
    const dir = path.join(__dirname, 'fixtures', fixture, agent)
    await cp(dir, cwd, { recursive: true })

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
  const items = readdirSync(fixtureDir)
  return items.filter(item => statSync(path.join(fixtureDir, item)).isDirectory())
}

it('stops at specified directory', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'ni-'))

  const noFilesDir = path.join(cwd, 'no-files')
  const nestedNoFilesDir = path.join(noFilesDir, 'nested')
  const parentDir = cwd

  await mkdir(noFilesDir, { recursive: true })
  await mkdir(nestedNoFilesDir, { recursive: true })

  await cp(
    path.join(__dirname, 'fixtures', 'lockfile', 'npm'),
    parentDir,
    { recursive: true },
  )

  const resultWithStop = await detect({
    cwd: nestedNoFilesDir,
    stopDir: noFilesDir,
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

it('stops at with custom stop function', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'ni-'))
  let count = 0

  const noFilesDir = path.join(cwd, 'no-files')
  const nestedNoFilesDir = path.join(noFilesDir, 'nested/nested')
  const parentDir = cwd

  await mkdir(noFilesDir, { recursive: true })
  await mkdir(nestedNoFilesDir, { recursive: true })

  await cp(
    path.join(__dirname, 'fixtures', 'lockfile', 'npm'),
    parentDir,
    { recursive: true },
  )

  const resultWithStop = await detect({
    cwd: nestedNoFilesDir,
    stopDir: () => {
      count++
      return count > 2
    },
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

describe('packageJsonParser', () => {
  it('uses custom package.json parser', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'ni-'))
    const fixturePath = path.join(__dirname, 'fixtures', 'packager', 'npm')
    await cp(fixturePath, cwd, { recursive: true })

    const parser = vi.fn((content: string) => JSON.parse(content))

    const result = await detect({
      cwd,
      packageJsonParser: parser,
    })

    expect(result).toMatchObject({
      name: 'npm',
      agent: 'npm',
    })

    expect(parser).toHaveBeenCalledTimes(1)
    expect(parser).toHaveBeenCalledWith(expect.stringContaining('"packageManager": "npm@7"'), path.join(cwd, 'package.json'))
  })

  it('uses custom package.json parser to modify result', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'ni-'))
    const fixturePath = path.join(__dirname, 'fixtures', 'packager', 'npm')
    await cp(fixturePath, cwd, { recursive: true })

    // Parser that lies about the package manager
    const parser = vi.fn(() => ({ packageManager: 'pnpm@8' }))

    const result = await detect({
      cwd,
      packageJsonParser: parser,
    })

    expect(result).toMatchObject({
      name: 'pnpm',
      agent: 'pnpm',
    })
  })
})

async function createProject(files: Record<string, string>) {
  const cwd = await mkdtemp(path.join(tmpdir(), 'ni-'))
  for (const [name, content] of Object.entries(files))
    await writeFile(path.join(cwd, name), content)
  return cwd
}

describe('strategy independence', () => {
  it('lockfile only looks at lock files', async () => {
    const cwd = await createProject({
      'pnpm-lock.yaml': '',
      'package.json': JSON.stringify({ packageManager: 'yarn@4.1.0' }),
    })

    expect(await detect({ cwd, strategies: ['lockfile'] })).toEqual({ name: 'pnpm', agent: 'pnpm' })
  })

  it('packageManager-field only looks at the packageManager field', async () => {
    const cwd = await createProject({
      'package.json': JSON.stringify({ devEngines: { packageManager: { name: 'pnpm' } } }),
    })

    expect(await detect({ cwd, strategies: ['packageManager-field'] })).toBe(null)
  })

  it('devEngines-field only looks at the devEngines field', async () => {
    const cwd = await createProject({
      'package.json': JSON.stringify({ packageManager: 'yarn@4.1.0' }),
    })

    expect(await detect({ cwd, strategies: ['devEngines-field'] })).toBe(null)
  })

  it('rush is a standalone strategy', async () => {
    const cwd = await createProject({
      'rush.json': '{}',
      'package.json': JSON.stringify({ packageManager: 'npm@10.0.0' }),
    })

    expect(await detect({ cwd })).toEqual({ name: 'pnpm', agent: 'pnpm-rush' })
    expect(await detect({ cwd, strategies: ['lockfile'] })).toBe(null)
  })

  it('default strategies still prefer the packageManager field over a lock file', async () => {
    const cwd = await createProject({
      'pnpm-lock.yaml': '',
      'package.json': JSON.stringify({ packageManager: 'yarn@4.1.0' }),
    })

    expect(await detect({ cwd })).toEqual({ name: 'yarn', agent: 'yarn@berry', version: 'berry' })
  })

  it('reads package.json once per directory for both field strategies', async () => {
    const cwd = await createProject({ 'package.json': JSON.stringify({ name: 'p' }) })
    const parser = vi.fn((content: string) => JSON.parse(content))

    expect(await detect({ cwd, packageJsonParser: parser })).toBe(null)
    expect(parser).toHaveBeenCalledTimes(1)
  })
})

describe('onUnknown', () => {
  it('receives the raw `packageManager` value', async () => {
    const cwd = await createProject({ 'package.json': JSON.stringify({ packageManager: 'future-pm@1.0.0' }) })
    const onUnknown = vi.fn(() => null)

    expect(await detect({ cwd, onUnknown })).toBe(null)
    expect(onUnknown).toHaveBeenCalledWith('future-pm@1.0.0')
  })

  it('receives the `devEngines.packageManager.name` value', async () => {
    const cwd = await createProject({
      'package.json': JSON.stringify({ devEngines: { packageManager: { name: 'future-pm' } } }),
    })
    const onUnknown = vi.fn(() => null)

    expect(await detect({ cwd, onUnknown })).toBe(null)
    expect(onUnknown).toHaveBeenCalledWith('future-pm')
  })

  it('can turn an unknown package manager into a result', async () => {
    const cwd = await createProject({ 'package.json': JSON.stringify({ packageManager: 'future-pm@1.0.0' }) })

    expect(await detect({ cwd, onUnknown: () => ({ name: 'npm', agent: 'npm' }) }))
      .toEqual({ name: 'npm', agent: 'npm' })
  })
})
