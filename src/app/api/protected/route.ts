import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/rbac";

export async function GET() {
  const auth = await requireRole(["OWNER", "ADMIN", "DEVOPS"]);

  if (auth.response) {
    return auth.response;
  }

  return NextResponse.json({
    status: "ok",
    message: "Protected infrastructure endpoint accessible",
    user: auth.session,
    permissions: {
      infrastructure: true,
      deployments: true,
      containers: true,
      incidents: true,
    },
  });
}
