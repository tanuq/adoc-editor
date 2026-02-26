import { join, resolve } from 'path'

export function safeJoin(workspace, userPath) {
  const resolved = resolve(join(workspace, userPath))
  const base = resolve(workspace)
  if (!resolved.startsWith(base + '/') && resolved !== base) return null
  return resolved
}
