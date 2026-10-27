import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cookieName = process.env.SESSION_COOKIE_NAME || "shop_session";
  const hasSession = Boolean(request.cookies.get(cookieName)?.value);
  const isLogin = pathname === "/login";
  const isLoginApi = pathname === "/api/auth/login";

  if (!hasSession && pathname.startsWith("/api/") && !isLoginApi) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Sign in required.", details: null } },
      { status: 401 },
    );
  }

  if (!hasSession && !isLogin && !isLoginApi) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (hasSession && isLogin) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
