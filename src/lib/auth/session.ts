import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth/jwt";

const COOKIE_NAME = "nexus_session";

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    return await verifyAuthToken(token);
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
