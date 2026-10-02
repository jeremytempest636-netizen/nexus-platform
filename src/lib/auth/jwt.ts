import { SignJWT, jwtVerify } from "jose";

const secret = process.env.JWT_SECRET;

if (!secret) {
  throw new Error("JWT_SECRET is not configured");
}

const secretKey = new TextEncoder().encode(secret);

export type AuthTokenPayload = {
  userId: string;
  email: string;
  role: "OWNER" | "ADMIN" | "DEVOPS" | "DEVELOPER" | "VIEWER";
};

export async function createAuthToken(payload: AuthTokenPayload) {
  return new SignJWT({
    email: payload.email,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

export async function verifyAuthToken(token: string) {
  const { payload } = await jwtVerify(token, secretKey);

  return {
    userId: payload.sub as string,
    email: payload.email as string,
    role: payload.role as AuthTokenPayload["role"],
  };
}
