import type { MockInstance } from 'vitest'
import { tmpdir } from 'node:os'
import path from 'node:path'
import fs from 'fs-extra'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { AGENTS, detectSync } from '../src'

let basicLog: MockInstance, errorLog: MockInstance, warnLog: MockInstance, infoLog: MockInstance

function detectTest(fixture: string, agent: string) {
  return async () => {
    const cwd = await fs.mkdtemp(path.join(tmpdir(), 'ni-'))
    const dir = path.join(__dirname, 'fixtures', fixture, agent)
    await fs.copy(dir, cwd)

    expect(detectSync({ cwd })).toMatchSnapshot()
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

const agents = [...AGENTS, 'unknown']
const fixtures = ['lockfile', 'packager']

// matrix testing of: fixtures x agents
fixtures.forEach(fixture => describe(fixture, () => agents.forEach((agent) => {
  it(agent, detectTest(fixture, agent))

  it('no logs', () => {
    expect(basicLog).not.toHaveBeenCalled()
    expect(warnLog).not.toHaveBeenCalled()
    expect(errorLog).not.toHaveBeenCalled()
    expect(infoLog).not.toHaveBeenCalled()
  })
})))

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

  const resultWithStop = detectSync({
    cwd: nestedNoFilesDir,
    stop: noFilesDir,
  })

  expect(resultWithStop).toBe(null)

  const resultWithoutStop = detectSync({
    cwd: nestedNoFilesDir,
  })

  expect(resultWithoutStop).toMatchObject({
    name: 'npm',
    agent: 'npm',
  })
})
