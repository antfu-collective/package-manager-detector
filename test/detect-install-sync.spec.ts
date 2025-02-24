import type { MockInstance } from 'vitest'
import { tmpdir } from 'node:os'
import path from 'node:path'
import fs from 'fs-extra'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { detectInstallSync } from '../src'

let basicLog: MockInstance, errorLog: MockInstance, warnLog: MockInstance, infoLog: MockInstance

function detectInstallTest(fixture: string, item: string) {
  return async () => {
    const cwd = await fs.mkdtemp(path.join(tmpdir(), 'ni-'))
    const dir = path.join(__dirname, 'fixtures', fixture, item)
    await fs.copy(dir, cwd)

    expect(detectInstallSync({ cwd })).toMatchSnapshot()
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

const fixtures = ['install']

fixtures.forEach(fixture => describe(fixture, () => {
  const fixtureDirs = getFixtureDirs(fixture)

  fixtureDirs.forEach((dir) => {
    it(dir, detectInstallTest(fixture, dir))
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
