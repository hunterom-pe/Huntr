import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export const proxy = auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const hasProfile = req.auth?.user?.hasProfile;

  const isDashboardRoute = nextUrl.pathname.startsWith("/dashboard");
  const isOnboardingRoute = nextUrl.pathname.startsWith("/onboarding");
  const isAuthRoute = nextUrl.pathname.startsWith("/login");

  // 1. Redirect to login if accessing protected routes while logged out
  if (!isLoggedIn && (isDashboardRoute || isOnboardingRoute)) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  // 2. Logic for logged-in users
  if (isLoggedIn) {
    // Allow users to revisit onboarding for resume re-uploads
    // We only enforce the redirect TO onboarding if they HAVE NO profile.
    if (!hasProfile && isDashboardRoute) {
      return NextResponse.redirect(new URL("/onboarding", nextUrl));
    }

    // Redirect away from login if already logged in
    if (isAuthRoute) {
      return NextResponse.redirect(new URL(hasProfile ? "/dashboard" : "/onboarding", nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*", "/login"],
};
