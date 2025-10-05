import { Prisma } from "@prisma/client";

const isJsonPrimitive = (value: unknown): value is string | number | boolean | null => {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
};

const isJsonValue = (value: unknown): value is Prisma.JsonValue => {
  if (isJsonPrimitive(value)) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).every(isJsonValue);
  }

  return false;
};

export const toNullableJsonInput = (
  value: unknown,
): Prisma.InputJsonValue | typeof Prisma.JsonNull => {
  if (value === undefined || value === null) {
    return Prisma.JsonNull;
  }

  if (isJsonValue(value)) {
    return value as Prisma.InputJsonValue;
  }

  return Prisma.JsonNull;
};
