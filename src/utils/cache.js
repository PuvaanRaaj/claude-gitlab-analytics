/**
 * localStorage-backed cache with TTL.
 *
 * Keys are prefixed with "obs_cache:" to avoid collisions.
 * Values are stored as { data, expiresAt } JSON.
 */

const PREFIX = 'obs_cache:'

export function cacheGet(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return null
    const { data, expiresAt } = JSON.parse(raw)
    if (Date.now() > expiresAt) {
      localStorage.removeItem(PREFIX + key)
      return null
    }
    return data
  } catch {
    return null
  }
}

export function cacheSet(key, data, ttlMs) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({
      data,
      expiresAt: Date.now() + ttlMs,
    }))
  } catch {
    // localStorage full or unavailable — silently skip
  }
}

export function cacheDelete(key) {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {}
}

/** Wipe all obs_cache entries (e.g. on sign-out) */
export function cacheClear() {
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .forEach(k => localStorage.removeItem(k))
  } catch {}
}

// TTL constants
export const TTL_1H  = 60 * 60 * 1000
export const TTL_6H  = 6  * TTL_1H
export const TTL_24H = 24 * TTL_1H
