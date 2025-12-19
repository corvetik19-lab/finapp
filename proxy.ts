import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  // Защита investor-portal (кроме login)
  if (pathname.startsWith("/investor-portal") && !pathname.startsWith("/investor-portal/login") && !pathname.startsWith("/investor-portal/invite")) {
    if (!user) {
      return NextResponse.redirect(new URL("/investor-portal/login", request.url));
    }

    // Проверяем доступ инвестора
    const { data: access } = await supabase
      .from("investor_access")
      .select("id")
      .eq("investor_user_id", user.id)
      .eq("status", "active")
      .limit(1);

    if (!access || access.length === 0) {
      return NextResponse.redirect(new URL("/investor-portal/login?error=no_access", request.url));
    }
  }

  // Защита protected routes
  if (pathname.startsWith("/(protected)") || 
      pathname.startsWith("/finance") || 
      pathname.startsWith("/investors") ||
      pathname.startsWith("/settings") ||
      pathname.startsWith("/dashboard")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/investor-portal/:path*",
    "/finance/:path*",
    "/investors/:path*",
    "/settings/:path*",
    "/dashboard/:path*",
  ],
};
