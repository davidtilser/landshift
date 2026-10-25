/* global console, process */
import { spawnSync } from 'node:child_process'
import { access, cp, mkdir, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { join, resolve } from 'node:path'

// Prepare before Vercel traces API bundles as well as before the frontend build.
// Ordinary local installs keep the existing explicit data-preparation workflow.
if (process.argv.includes('--if-vercel') && process.env['VERCEL'] !== '1')
  process.exit(0)

const root = resolve(import.meta.dirname, '..')
const inputs = [
  'scripts/prepare-deployment.mjs',
  'scripts/data/prepare-san-jose.mjs',
  'scripts/data/prepare-golden-gate.mjs',
  'scripts/data/prepare-cesium.mjs',
  'scripts/data/verify-san-jose.mjs',
  'src/game/geometry.ts',
  'package-lock.json',
]
const hash = createHash('sha256')
for (const input of inputs) hash.update(await readFile(join(root, input)))
// Vercel caches node_modules between builds. Invalidate packs when their code changes.
const cache = join(
  root,
  'node_modules/.cache/landshift-data',
  hash.digest('hex'),
)

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

function run(script, ...args) {
  const result = spawnSync(process.execPath, [join(root, script), ...args], {
    cwd: root,
    stdio: 'inherit',
  })
  if (result.error) throw result.error
  if (result.status !== 0)
    throw new Error(`${script} failed; the deployment has not been built.`)
}

for (const [id, prepare] of [
  ['golden-gate-park', 'scripts/data/prepare-golden-gate.mjs'],
  ['san-jose-dc04', 'scripts/data/prepare-san-jose.mjs'],
]) {
  const pack = join(root, 'public/data', id)
  const cachedPack = join(cache, id)
  if (!(await exists(join(pack, 'manifest.json')))) {
    if (await exists(join(cachedPack, 'manifest.json'))) {
      console.log(`Restoring cached geographic pack: ${id}`)
      await cp(cachedPack, pack, { recursive: true })
    } else {
      console.log(`Preparing geographic pack: ${id}`)
      run(prepare)
    }
  }
  if (!(await exists(join(pack, 'cesium-heightmap.json'))))
    run('scripts/data/prepare-cesium.mjs', id)
  // Never publish a partial or corrupted pack, including a restored cache.
  run('scripts/data/verify-san-jose.mjs', id)
  await mkdir(cache, { recursive: true })
  await cp(pack, cachedPack, { recursive: true })
}
