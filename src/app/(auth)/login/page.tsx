"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  UsersRound, 
  Mail, 
  Lock, 
  Loader2, 
  ShieldCheck, 
  ArrowRight,
  AlertTriangle
} from "lucide-react";

// `useSearchParams` opts the component out of static prerendering
// unless it sits under a Suspense boundary. We split the form into
// a child component so the outer page can prerender the chrome
// (background, card frame) while the form hydrates with the query
// string on the client.
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    }>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const searchParams = useSearchParams();
  // Forwarded from `/join/<token>` when the visitor already has an
  // account. After a successful sign-in we send them to the join
  // page to accept rather than to /dashboard.
  const inviteToken = searchParams.get("invite");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      password,
      // Normalize email inputs (lowercase & trimmed)
      email: email.trim().toLowerCase(),
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      // Send failed login alert (non-blocking)
      fetch("/api/auth/failed-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      }).catch(() => {});
      return;
    }

    // Send login alert email (non-blocking — don't delay redirect)
    fetch("/api/auth/login-alert", { method: "POST" }).catch(() => {});

    if (inviteToken) {
      router.push(`/join/${encodeURIComponent(inviteToken)}`);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 relative overflow-hidden">
      {/* Premium background radial gradient + mesh grid */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-30 -left-30 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute -bottom-45 -right-45 w-[650px] h-[650px] bg-purple-650/5 rounded-full blur-[160px] animate-pulse delay-700" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff05_1px,transparent_1px)] [background-size:24px_24px] opacity-75" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in duration-500 p-[1.5px] rounded-[2.5rem] bg-gradient-to-b from-primary/30 via-zinc-800 to-zinc-900/50 shadow-[0_0_50px_rgba(0,0,0,0.85)]">
        <Card className="border-none bg-zinc-950/80 backdrop-blur-2xl rounded-[2.4rem] overflow-hidden relative">
          {/* Subtle overlay shine */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/[0.015] to-white/0 pointer-events-none" />
          
          <CardHeader className="items-center text-center pb-2 pt-8">
            {/* Logo / Badge Ring */}
            <div className="relative mb-4 mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900/80 border border-zinc-850 shadow-[inset_0_1px_rgba(255,255,255,0.05)] overflow-hidden hover:scale-105 transition-transform duration-300">
              {inviteToken ? (
                <UsersRound className="h-6.5 w-6.5 text-primary animate-pulse" />
              ) : (
                <img src="/logo.jpg" alt="Avorex Logo" className="h-full w-full object-cover" />
              )}
            </div>
            
            <div className="space-y-1">
              <CardTitle className="text-2xl font-black text-white tracking-tight">
                {inviteToken ? "Accept Invite" : "Avorex Technologies"}
              </CardTitle>
              <CardDescription className="text-zinc-400 text-xs font-medium">
                {inviteToken
                  ? "Sign in to accept your team invitation"
                  : "WhatsApp Automation & CRM Gateway"}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="px-6 md:px-8 pb-8 pt-4">
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              {error && (
                <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-xs text-red-400 flex items-start gap-2.5 animate-in shake duration-200">
                  <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email" className="text-zinc-400 text-xs font-semibold px-0.5">
                  Email Address
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 border-zinc-800 bg-zinc-900/60 text-white rounded-xl placeholder:text-zinc-600 focus:border-primary focus:ring-1 focus:ring-primary/20 text-sm h-11 transition-all"
                  />
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between px-0.5">
                  <Label htmlFor="password" className="text-zinc-400 text-xs font-semibold">
                    Password
                  </Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-primary hover:text-primary/80 transition-colors font-bold"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 border-zinc-800 bg-zinc-900/60 text-white rounded-xl placeholder:text-zinc-600 focus:border-primary focus:ring-1 focus:ring-primary/20 text-sm h-11 transition-all"
                  />
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="mt-3 h-11 w-full bg-gradient-to-r from-primary to-blue-600 hover:from-primary/95 hover:to-blue-500 text-white font-bold rounded-xl gap-1.5 transition-all shadow-[0_0_20px_rgba(59,130,246,0.25)] hover:shadow-[0_0_25px_rgba(59,130,246,0.35)] active:scale-98 text-xs uppercase tracking-wider"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-zinc-500 font-medium">
              Don&apos;t have an account?{" "}
              <Link
                href={
                  inviteToken
                    ? `/signup?invite=${encodeURIComponent(inviteToken)}`
                    : "/signup"
                }
                className="text-primary hover:text-primary/80 font-bold transition-colors"
              >
                Create account
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
