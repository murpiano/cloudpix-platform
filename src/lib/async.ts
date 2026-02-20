/** Calls `notify` once if `task` is still pending after `ms`; the result passes through untouched. */
export const onSlow = <T>(task: Promise<T>, ms: number, notify: () => void): Promise<T> => {
  const timer = setTimeout(notify, ms);
  return task.finally(() => clearTimeout(timer));
};
