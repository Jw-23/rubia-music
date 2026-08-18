const enabled = import.meta.env.DEV

export function sourceDebug(event: string, detail?: unknown) {
  if (!enabled) return
  if (detail === undefined) console.debug(`[music-source] ${event}`)
  else console.debug(`[music-source] ${event}`, detail)
}

export function sourceDebugError(event: string, detail?: unknown) {
  if (!enabled) return
  if (detail === undefined) console.error(`[music-source] ${event}`)
  else console.error(`[music-source] ${event}`, detail)
}

export const sourceDebugEnabled = enabled
