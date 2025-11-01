import is from '@sindresorhus/is';

export const formatError = (error: unknown, fallback: string): string =>
  is.error(error) ? error.message : fallback;
