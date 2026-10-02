import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";

export type UserRole =
  | "OWNER"
  | "ADMIN"
  | "DEVOPS"
  | "DEVELOPER"
  | "VIEWER";

export async function requireAuth() {
  const session = await getCurrentSession();

  if (!session) {
    throw new Error("Authentication required");
  }

  return session;
}

export async function requireRole(allowedRoles: UserRole[]) {
  const session = await getCurrentSession();

  if (!session) {
    return {
      session: null,
      response: NextResponse.json(
        {
          error: "Authentication required",
        },
        { status: 401 }
      ),
    };
  }

  if (!allowedRoles.includes(session.role)) {
    return {
      session: null,
      response: NextResponse.json(
        {
          error: "Insufficient permissions",
          requiredRoles: allowedRoles,
        },
        { status: 403 }
      ),
    };
  }

  return {
    session,
    response: null,
  };
}