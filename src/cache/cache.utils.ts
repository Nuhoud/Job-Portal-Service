const normalizeForKey = (value: unknown): unknown => {
  if (value instanceof RegExp) {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value && typeof value === 'object' && (value as Record<string, unknown>)._bsontype === 'ObjectID') {
    return (value as { toString: () => string }).toString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeForKey(item));
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = normalizeForKey((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }

  return value;
};

const serialize = (value: unknown): string => JSON.stringify(normalizeForKey(value));

export const DEFAULT_CACHE_TTL_MS = 120;

export const buildCacheKey = (namespace: string, payload?: unknown): string => {
  if (payload === undefined) {
    return namespace;
  }

  return `${namespace}:${serialize(payload)}`;
};

export const buildRequestCacheKey = (method: string, url: string, extra?: unknown): string =>
  buildCacheKey('http', { method, url, extra });

export const jobOfferCacheKeys = {
  list: (filters: unknown, pagination: unknown) =>
    buildCacheKey('job-offers:list', { filters, pagination }),
  search: (searchTerm: string, filters: unknown, pagination: unknown) =>
    buildCacheKey('job-offers:search', { searchTerm, filters, pagination }),
  detail: (id: string) => buildCacheKey('job-offers:detail', { id }),
  analytics: (employerId?: string) =>
    buildCacheKey('job-offers:analytics', { employerId: employerId ?? 'all' }),
  stats: (employerId: string) => buildCacheKey('job-offers:stats', { employerId }),
  expiring: (employerId: string, days?: number) =>
    buildCacheKey('job-offers:expiring', { employerId, days: days ?? 7 }),
};

export const applicationCacheKeys = {
  list: (filters: unknown, pagination: unknown) =>
    buildCacheKey('applications:list', { filters, pagination }),
  byJob: (jobOfferId: string, pagination: unknown) =>
    buildCacheKey('applications:job', { jobOfferId, pagination }),
  byUser: (userId: string, pagination: unknown) =>
    buildCacheKey('applications:user', { userId, pagination }),
  detail: (id: string) => buildCacheKey('applications:detail', { id }),
};
