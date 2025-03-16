import type { MockInstance } from 'vitest'
import type { DetectOptions } from '../src'
import { tmpdir } from 'node:os'
import path from 'node:path'
import fs from 'fs-extra'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { detect } from '../src'

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

const fixtures = ['lockfile', 'packager', 'install-metadata']

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
