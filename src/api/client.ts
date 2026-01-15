import { API_URL, Endpoint, SERVER_URL, Timing } from '@/config';
import { parsePhotos } from './parse';
import type { Photo } from './types';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const send = async (path: string, init: RequestInit = {}): Promise<Response> => {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      signal: AbortSignal.timeout(Timing.REQUEST_TIMEOUT),
      ...init,
    });
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : 'Network error');
  }

  if (!response.ok) {
    throw new ApiError(`Request failed with status ${response.status}`, response.status);
  }

  return response;
};

export const fetchPhotos = async (): Promise<Photo[]> => {
  const response = await send(Endpoint.PHOTOS);
  return parsePhotos(await response.json());
};

export const uploadPhoto = async (body: FormData): Promise<void> => {
  await send(Endpoint.UPLOAD, { method: 'POST', body });
};

/** Server paths are relative to the server root, e.g. `public/.../1.jpg`. */
export const assetUrl = (path: string): string => new URL(path, `${SERVER_URL}/`).href;
