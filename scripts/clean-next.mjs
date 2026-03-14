import { existsSync, rmSync } from 'node:fs'
import path from 'node:path'

const nextDir = path.join(process.cwd(), '.next')

if (!existsSync(nextDir)) {
  console.log('.next cache not found, nothing to clean.')
  process.exit(0)
}

rmSync(nextDir, { recursive: true, force: true })
console.log('Removed .next cache.')
