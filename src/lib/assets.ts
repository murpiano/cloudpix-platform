/** A file of the bundled demo, under the base path so it works under /cloudpix-platform/ too. */
export const demoUrl = (path: string): string => `${import.meta.env.BASE_URL}demo/${path}`;
