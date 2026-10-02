import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth/session";

export async function POST() {
  const response = NextResponse.json({
    message: "Logout successful",
  });

  response.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });

  return response;
}
