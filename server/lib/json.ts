import { attempt } from '@jfdi/attempt';

export const parseJson = <T = unknown>(value: unknown): T | string => {
  if (typeof value !== 'string') return value as T;
  const [error, result] = attempt(() => JSON.parse(value));
  return error ? value : result;
};
