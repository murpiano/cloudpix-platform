export const SERVER_URL = 'https://bvtrots-test-server.onrender.com';
export const API_URL = `${SERVER_URL}/cloudpix-platform`;

export const Endpoint = {
  PHOTOS: '/data',
  UPLOAD: '/upload',
} as const;

/** The backend runs on a free Render instance that sleeps; a cold start takes up to a minute. */
export const Timing = {
  WAKE_HINT_AFTER: 3_000,
  REQUEST_TIMEOUT: 90_000,
  SPLASH_MIN: 1_150,
  DECODE_BACKSTOP: 9_000,
} as const;

export const Links = {
  telegram: 'https://t.me/murpiano',
  vk: 'https://vk.com/murpiano',
  github: 'https://github.com/murpiano',
  source: 'https://github.com/murpiano/cloudpix-platform',
} as const;
