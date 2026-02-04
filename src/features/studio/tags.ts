export const TagRules = {
  MAX_COUNT: 6,
  MIN_LENGTH: 2,
  MAX_LENGTH: 24,
  PATTERN: /^[\p{L}\p{N}_]+$/u,
} as const;

/** "#Sea_Light " -> "sea_light"; the leading # is optional when typing. */
export const normalizeTag = (raw: string): string => raw.trim().replace(/^#+/, '').toLowerCase();

/** Returns an error message, or null when `tag` can join `existing`. */
export const tagError = (tag: string, existing: readonly string[]): string | null => {
  if (existing.length >= TagRules.MAX_COUNT) {
    return `Up to ${TagRules.MAX_COUNT} tags per frame`;
  }

  if (tag.length < TagRules.MIN_LENGTH || tag.length > TagRules.MAX_LENGTH) {
    return `A tag needs ${TagRules.MIN_LENGTH}–${TagRules.MAX_LENGTH} characters`;
  }

  if (!TagRules.PATTERN.test(tag)) {
    return 'Tags use letters, digits and _ only';
  }

  if (existing.includes(tag)) {
    return `#${tag} is already added`;
  }

  return null;
};

export const serializeTags = (tags: readonly string[]): string =>
  tags.map((tag) => `#${tag}`).join(' ');
