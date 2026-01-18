const PREFIX = 'cloudpix:';

/** localStorage can be missing or throw (private mode, blocked site data) — never let it break the page. */
export const readJSON = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
};

export const writeJSON = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage unavailable: the value simply is not remembered.
  }
};
