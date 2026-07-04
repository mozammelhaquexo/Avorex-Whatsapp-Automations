"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { PresenceHeartbeat } from "@/components/presence/presence-heartbeat";
import { Button } from "@/components/ui/button";
import { AlertTriangle, KeyRound } from "lucide-react";
import { MenuGuard } from "@/components/auth/menu-guard";

type DecisionTree =
  | "NO_PLAN"
  | "NO_LICENSE"
  | "ACTIVE_PLAN_VERIFIED"
  | "EXPIRED"
  | "SUSPENDED_OR_REVOKED"
  | "PACKAGE_MISMATCH"
  | "DEVICE_NOT_AUTHORIZED"
  | "ERROR"
  | string;

// Auth-gated dashboard shell (client). License gating is now backend-driven
// via GET /api/license/validate (decisionTree). The UI never infers plan
// status from local account columns.
function LicenseExpiredOverlay() {
  const router = useRouter();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-md p-[1.5px] rounded-[2.5rem] bg-gradient-to-b from-red-500/40 via-zinc-800 to-zinc-900/50 shadow-[0_0_50px_rgba(0,0,0,0.85)]">
        <div className="bg-zinc-950/90 backdrop-blur-2xl rounded-[2.4rem] p-6 md:p-8 text-center relative overflow-hidden">
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-red-500/5 rounded-full blur-2xl" />

          <div className="relative mb-5 mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 shadow-[inset_0_1px_rgba(255,255,255,0.05)]">
            <AlertTriangle className="h-7 w-7" />
            <div className="absolute -inset-1.5 border border-red-500/10 rounded-[22px] animate-ping duration-1000 opacity-25" />
          </div>

          <h3 className="text-xl font-black text-white tracking-tight">মেয়াদ শেষ হয়ে গেছে! (Validity Expired)</h3>

          <p className="text-sm font-bold text-red-400 mt-3 leading-relaxed">আপনার ডাটা সম্পূর্ণ নিরাপদ আছে। অনুগ্রহ করে আপনার প্যাকেজটি রিনিউ করুন।</p>

          <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
            Your database records and configurations are fully preserved. Please renew your workspace subscription to restore dashboard access.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <Button
              onClick={() => router.push("/activate")}
              className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold h-11 rounded-xl gap-2 transition-all shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:shadow-[0_0_25px_rgba(239,68,68,0.35)] active:scale-98 text-xs uppercase tracking-wider"
            >
              <KeyRound className="h-4 w-4" />
              প্যাকেজ রিনিউ করুন (Renew Package)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardShellInner({ children }: { children: React.ReactNode }) {
  const { user, loading, profileLoading } = useAuth();
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const [licenseCheckLoading, setLicenseCheckLoading] = useState(true);
  const [decisionTree, setDecisionTree] = useState<DecisionTree | null>(null);

  // Backend license decision
  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (loading || profileLoading) return;

      if (!user) {
        setDecisionTree(null);
        setLicenseCheckLoading(false);
        return;
      }

      // Admin can bypass gating.
      const isPlatformAdmin = user.email === "admin@avorex.com";
      if (isPlatformAdmin) {
        setDecisionTree("ACTIVE_PLAN_VERIFIED");
        setLicenseCheckLoading(false);
        return;
      }

      setLicenseCheckLoading(true);
      try {
        const res = await fetch("/api/license/validate", { method: "GET" });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        setDecisionTree(data?.decisionTree ?? "ERROR");
      } catch {
        if (cancelled) return;
        setDecisionTree("ERROR");
      } finally {
        if (!cancelled) setLicenseCheckLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [user, loading, profileLoading]);

  // Redirect based on decisionTree.
  useEffect(() => {
    if (loading || profileLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }

    if (user.email === "admin@avorex.com") return;

    if (!decisionTree) return;

    if (
      decisionTree === "NO_PLAN" ||
      decisionTree === "NO_LICENSE" ||
      decisionTree === "PACKAGE_MISMATCH" ||
      decisionTree === "DEVICE_NOT_AUTHORIZED" ||
      decisionTree === "ERROR"
    ) {
      router.push("/activate");
      return;
    }

    if (decisionTree === "SUSPENDED_OR_REVOKED" || decisionTree === "EXPIRED") {
      router.push("/activate");
      return;
    }
  }, [decisionTree, loading, profileLoading, router, user]);

  const authResolved = !loading && (!user || !profileLoading);

  if (loading || (user && profileLoading) || (user && !authResolved) || (user && licenseCheckLoading)) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const showExpiredOverlay = decisionTree === "EXPIRED";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <PresenceHeartbeat />
      <Sidebar open={sidebarOpen} onClose={closeSidebar} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6"><MenuGuard>{children}</MenuGuard></main>
      </div>
      {showExpiredOverlay && <LicenseExpiredOverlay />}
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardShellInner>{children}</DashboardShellInner>
    </AuthProvider>
  );
}
