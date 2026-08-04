import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Publish dist/ to the gh-pages branch.
 *
 * Same as the previous `gh-pages -d dist` npm script, with one addition:
 * enable core.longpaths for this process only. That fixes Windows
 * "Filename too long" errors on deep OneDrive paths, and is harmless
 * elsewhere (macOS/Linux, or Windows with short paths).
 *
 * Invokes the gh-pages JS entry via node (no shell) so paths with spaces
 * — e.g. OneDrive folder names — do not break on Windows.
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const ghPagesJs = path.join(root, 'node_modules', 'gh-pages', 'bin', 'gh-pages.js')

if (!fs.existsSync(ghPagesJs)) {
  console.error(`Could not find ${ghPagesJs}. Run npm install first.`)
  process.exit(1)
}

const env = {
  ...process.env,
  GIT_CONFIG_COUNT: '1',
  GIT_CONFIG_KEY_0: 'core.longpaths',
  GIT_CONFIG_VALUE_0: 'true',
}

const result = spawnSync(process.execPath, [ghPagesJs, '-d', dist], {
  cwd: root,
  env,
  stdio: 'inherit',
})

if (result.error) {
  console.error(result.error)
  process.exit(1)
}

process.exit(result.status ?? 1)
