import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";

const PRO_ROUTES = ["/dashboard/pro"];
const ADMIN_ROUTES = ["/dashboard/admin"];
const PROTECTED = ["/dashboard"];

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const session = await auth();
  if (!session?.user) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  const role = session.user.role;
  if (PRO_ROUTES.some((p) => pathname.startsWith(p)) && role !== "PRO" && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  if (ADMIN_ROUTES.some((p) => pathname.startsWith(p)) && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
