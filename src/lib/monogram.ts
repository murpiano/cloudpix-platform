/** Up to two initials from a display name: "Anna Lee" -> "AL", "stephan" -> "S". */
export const initials = (name: string): string => {
  const letters = name
    .trim()
    .split(/\s+/)
    .map((word) => [...word][0] ?? '')
    .filter(Boolean)
    .slice(0, 2)
    .join('');

  return letters.toUpperCase() || '?';
};

/** Stable hue in 0..359 derived from a string (FNV-1a). */
export const hueOf = (value: string): number => {
  let hash = 0x811c9dc5;

  for (const char of value) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0) % 360;
};
