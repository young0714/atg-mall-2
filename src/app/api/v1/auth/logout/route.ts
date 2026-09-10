import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth/session";

export async function POST(req: Request) {
  destroySession();
  const acceptsHtml = req.headers.get("accept")?.includes("text/html");
  if (acceptsHtml) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  return NextResponse.json({ data: { success: true } });
}
