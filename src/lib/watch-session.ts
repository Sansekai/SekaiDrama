/**
 * Watch Session Manager
 * 
 * Manages short-lived tokens in sessionStorage to map random watch URLs
 * to real episode identifiers. This prevents users from directly accessing
 * watch pages without going through the detail page (and QRIS popup).
 */

const STORAGE_KEY = "sd_watch";

export interface WatchSessionData {
  platform: string;
  bookId: string;
  /** Real episode identifier — meaning varies by platform */
  episodeId?: string;
  episodeNumber?: number;
  episodeIndex?: number;
  createdAt: number;
}

/** Generate a random 16-char alphanumeric token */
function generateToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => chars[b % chars.length]).join("");
}

function getMap(): Record<string, WatchSessionData> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveMap(map: Record<string, WatchSessionData>) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // sessionStorage full or unavailable — silently fail
  }
}

/** Purge entries older than 24 hours */
function cleanup(map: Record<string, WatchSessionData>) {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const key of Object.keys(map)) {
    if (map[key].createdAt < cutoff) delete map[key];
  }
}

/**
 * Create a new watch token and store the session mapping.
 * Returns the token string to use in the URL.
 */
export function createWatchToken(data: Omit<WatchSessionData, "createdAt">): string {
  const token = generateToken();
  const map = getMap();
  cleanup(map);
  map[token] = { ...data, createdAt: Date.now() };
  saveMap(map);
  return token;
}

/**
 * Retrieve the session data for a given token.
 * Returns null if the token doesn't exist (e.g. direct URL access).
 */
export function getWatchSession(token: string): WatchSessionData | null {
  if (!token) return null;
  const map = getMap();
  return map[token] ?? null;
}

/**
 * Update the episode data for an existing token and return a NEW token.
 * The old token is deleted to prevent reuse.
 */
export function updateWatchSession(
  oldToken: string,
  updates: Partial<Omit<WatchSessionData, "createdAt">>
): string {
  const map = getMap();
  const existing = map[oldToken];
  if (!existing) {
    // No existing session — create fresh
    return createWatchToken({
      platform: updates.platform || "",
      bookId: updates.bookId || "",
      ...updates,
    });
  }
  delete map[oldToken];
  const newToken = generateToken();
  map[newToken] = { ...existing, ...updates, createdAt: Date.now() };
  saveMap(map);
  return newToken;
}
