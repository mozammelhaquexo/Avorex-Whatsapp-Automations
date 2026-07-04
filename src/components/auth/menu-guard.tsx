"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

/**
 * Route-level guard that redirects users away from routes not included
 * in their package's `allowed_menus`. Wrap dashboard layout children
 * with this component.
 *
 * Platform admin (admin@avorex.com) always passes.
 * While auth/profile is loading, renders nothing (avoids flash).
 */
export function MenuGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, account, profile, loading, profileLoading } = useAuth();

  useEffect(() => {
    if (loading || profileLoading) return;
    if (!user) return;

    // Platform super admin bypasses all menu restrictions
    if (profile?.email === "admin@avorex.com") return;

    const allowed = account?.allowed_menus;
    if (!allowed || allowed.length === 0) return; // No restrictions set

    // Extract the menu key from the pathname (e.g. "/agents" → "agents")
    const menuKey = pathname.split("/").filter(Boolean)[0];
    if (!menuKey) return; // Root path, let it through

    // Dashboard and Settings are always allowed
    if (menuKey === "dashboard" || menuKey === "settings") return;

    if (!allowed.includes(menuKey)) {
      router.replace("/dashboard");
    }
  }, [user, account, profile, loading, profileLoading, pathname, router]);

  // Don't render children while loading to prevent flash of restricted content
  if (loading || profileLoading) return null;

  return <>{children}</>;
}
