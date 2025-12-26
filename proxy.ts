import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (Middleware) для централизованной проверки аутентификации
 * 
 * Защищённые маршруты:
 * - /dashboard, /transactions, /accounts, /categories, /reports, /settings
 * - /tenders/*, /admin/*, /superadmin/*
 * - /ai-studio/*, /ai-advisor/*, /ai-analytics/*
 * - /finance/*, /personal/*, /investor-portal/*
 */
export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[Proxy] Supabase env vars missing");
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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
  });

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  // Защита investor-portal (кроме login)
  if (pathname.startsWith("/investor-portal") && !pathname.startsWith("/investor-portal/login") && !pathname.startsWith("/investor-portal/invite")) {
    if (!user) {
      return NextResponse.redirect(new URL("/investor-portal/login", request.url));
    }

    // Проверяем роль пользователя - админы и владельцы имеют полный доступ
    const { data: membership } = await supabase
      .from("organization_members")
      .select("role")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    const isAdmin = membership?.role === "admin" || membership?.role === "owner";

    // Если не админ, проверяем доступ инвестора
    if (!isAdmin) {
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
  }

  // Защита admin/superadmin маршрутов
  if (user && (pathname.startsWith("/admin") || pathname.startsWith("/superadmin"))) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("global_role")
      .eq("id", user.id)
      .single();

    const globalRole = profile?.global_role;

    // Superadmin маршруты только для superadmin
    if (pathname.startsWith("/superadmin") && globalRole !== "superadmin") {
      return NextResponse.redirect(new URL("/blocked", request.url));
    }

    // Admin маршруты для admin и superadmin
    if (pathname.startsWith("/admin") && !["admin", "superadmin"].includes(globalRole || "")) {
      return NextResponse.redirect(new URL("/blocked", request.url));
    }
  }

  // Защита protected routes
  if (pathname.startsWith("/finance") || 
      pathname.startsWith("/investors") ||
      pathname.startsWith("/settings") ||
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/transactions") ||
      pathname.startsWith("/accounts") ||
      pathname.startsWith("/categories") ||
      pathname.startsWith("/reports") ||
      pathname.startsWith("/tenders") ||
      pathname.startsWith("/ai-studio") ||
      pathname.startsWith("/personal") ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/superadmin")) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(loginUrl);
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
    "/transactions/:path*",
    "/accounts/:path*",
    "/categories/:path*",
    "/reports/:path*",
    "/tenders/:path*",
    "/ai-studio/:path*",
    "/personal/:path*",
    "/admin/:path*",
    "/superadmin/:path*",
  ],
};
