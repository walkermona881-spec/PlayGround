import { accessSync, constants, cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'src')
const target = join(root, 'dist')

accessSync(join(source, 'index.html'), constants.R_OK)

rmSync(target, { recursive: true, force: true })
mkdirSync(target, { recursive: true })
cpSync(source, target, { recursive: true })

writeFileSync(
  join(target, 'build-info.json'),
  `${JSON.stringify({ source: 'src', builtAt: new Date().toISOString() }, null, 2)}\n`
)

console.log(`Built static app: ${target}`)
