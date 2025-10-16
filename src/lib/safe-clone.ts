const getStructuredClone = () => {
  const candidate = (globalThis as { structuredClone?: unknown }).structuredClone;
  return typeof candidate === "function"
    ? (candidate as <T>(value: T) => T)
    : undefined;
};

const structuredCloneFn = getStructuredClone();

const cloneFallback = <T>(value: T): T => {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (value instanceof Date) {
    return new Date(value.getTime()) as unknown as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => cloneFallback(item)) as unknown as T;
  }

  const result: Record<string, unknown> = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
    result[key] = cloneFallback(entry);
  });
  return result as T;
};

export const safeStructuredClone = <T>(value: T): T => {
  if (structuredCloneFn) {
    return structuredCloneFn(value);
  }
  return cloneFallback(value);
};
