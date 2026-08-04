import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Publish dist/ to the gh-pages branch.
 *
 * Same as the previous `gh-pages -d dist` npm script, with one addition:
 * enable core.longpaths for this process only. That fixes Windows
 * "Filename too long" errors on deep OneDrive paths, and is a no-op
 * harmlessly ignored elsewhere (macOS/Linux, or Windows with short paths).
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const binName = process.platform === 'win32' ? 'gh-pages.cmd' : 'gh-pages'
const bin = path.join(root, 'node_modules', '.bin', binName)

if (!fs.existsSync(bin)) {
  console.error(`Could not find ${bin}. Run npm install first.`)
  process.exit(1)
}

const env = {
  ...process.env,
  GIT_CONFIG_COUNT: '1',
  GIT_CONFIG_KEY_0: 'core.longpaths',
  GIT_CONFIG_VALUE_0: 'true',
}

const result = spawnSync(bin, ['-d', dist], {
  cwd: root,
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

if (result.error) {
  console.error(result.error)
  process.exit(1)
}

process.exit(result.status ?? 1)
