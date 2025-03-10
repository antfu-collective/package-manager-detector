import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'
import { getPackageExportsManifest } from 'vitest-package-exports'

it('exports-snapshot', async () => {
  const manifest = await getPackageExportsManifest({
    importMode: 'src',
    cwd: fileURLToPath(import.meta.url),
  })
  expect(manifest.exports).toMatchInlineSnapshot(`
    {
      ".": {
        "AGENTS": "object",
        "COMMANDS": "object",
        "INSTALL_PAGE": "object",
        "LOCKS": "object",
        "constructCommand": "function",
        "detect": "function",
        "getUserAgent": "function",
        "resolveCommand": "function",
      },
      "./commands": {
        "COMMANDS": "object",
        "constructCommand": "function",
        "resolveCommand": "function",
      },
      "./constants": {
        "AGENTS": "object",
        "INSTALL_PAGE": "object",
        "LOCKS": "object",
      },
      "./detect": {
        "detect": "function",
        "getUserAgent": "function",
      },
    }
  `)
})
