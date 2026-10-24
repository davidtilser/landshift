import { cp, mkdir, stat } from 'node:fs/promises'
import { resolve, join } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const source = join(root, 'node_modules/cesium/Build/Cesium')
const target = join(root, 'public/cesium')
await mkdir(target, { recursive: true })
for (const directory of ['Assets', 'Workers', 'ThirdParty', 'Widgets']) {
  const from = join(source, directory)
  const to = join(target, directory)
  // Copy only if the installed package is newer than the prepared directory.
  const installed = await stat(from)
  const prepared = await stat(to).catch(() => null)
  if (!prepared || prepared.mtimeMs < installed.mtimeMs)
    await cp(from, to, { recursive: true })
}
