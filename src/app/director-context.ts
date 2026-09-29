import { createContext, useContext } from 'react';
import type { Director } from '@/tour/director';

export const DirectorContext = createContext<Director | null>(null);

export const useDirector = (): Director => {
  const director = useContext(DirectorContext);
  if (!director) throw new Error('useDirector needs a DirectorContext');
  return director;
};
