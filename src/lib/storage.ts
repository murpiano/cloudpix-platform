const PREFIX = 'my-world:';

/** localStorage can be missing or throw (private mode, blocked site data) — never let it break the page. */
export const readJSON = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
};

/** True when the value was kept. False when storage is blocked or out of room. */
export const writeJSON = (key: string, value: unknown): boolean => {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};
