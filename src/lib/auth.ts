import crypto from "node:crypto";
import jwt from "jsonwebtoken";

interface UserPayload {
  userId: string;
}

type GlobalAuth = {
  jwtSecret?: string;
};

const globalForAuth = globalThis as unknown as GlobalAuth;

function resolveJwtSecret(): string {
  if (globalForAuth.jwtSecret) {
    return globalForAuth.jwtSecret;
  }

  const envSecret = process.env.JWT_SECRET?.trim();
  if (envSecret) {
    globalForAuth.jwtSecret = envSecret;
    return envSecret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET is not defined in the environment variables.",
    );
  }

  const fallbackSecret = crypto.randomBytes(32).toString("hex");
  console.warn(
    "[auth] JWT_SECRET is not configured. Generated a temporary development secret.",
  );
  globalForAuth.jwtSecret = fallbackSecret;
  return fallbackSecret;
}

const JWT_SECRET = resolveJwtSecret();

export function signToken(payload: UserPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
}

export function verifyToken(token: string): UserPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserPayload;
  } catch {
    return null;
  }
}

export function getAuthPayload(request: Request): UserPayload | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return null;
  }

  return verifyToken(token);
}

export type { UserPayload };
