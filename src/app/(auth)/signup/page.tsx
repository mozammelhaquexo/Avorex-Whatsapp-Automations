"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  MessageSquare,
  CheckCircle,
  UsersRound,
  Eye,
  EyeOff,
  Loader2,
  ArrowLeft,
  User,
  Mail,
  Lock,
  AlertTriangle
} from "lucide-react";

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    }>
      <SignupPageInner />
    </Suspense>
  );
}

function SignupPageInner() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Step tracking: "form" → "sending" → "otp" → "creating" → "success"
  const [step, setStep] = useState<"form" | "sending" | "otp" | "creating" | "success">("form");
  const [otp, setOtp] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  const supabase = createClient();

  // Step 1: Validate form and send code via Gmail SMTP
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setStep("sending");

    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send verification code");
        setStep("form");
        setLoading(false);
        return;
      }

      setStep("otp");
      startResendTimer();
    } catch {
      setError("Failed to send verification code. Please try again.");
      setStep("form");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP code + create account in one call
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStep("creating");

    try {
      const res = await fetch("/api/auth/complete-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otp, password, fullName }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to verify code");
        setStep("otp");
        return;
      }

      setStep("success");
    } catch {
      setError("Something went wrong. Please try again.");
      setStep("otp");
    }
  };

  // Resend code
  const handleResendCode = async () => {
    setError(null);
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        startResendTimer();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to resend code");
      }
    } catch {
      setError("Failed to resend code");
    }
  };

  const startResendTimer = () => {
    setResendTimer(60);
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const renderBackground = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-30 -left-30 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] animate-pulse" />
      <div className="absolute -bottom-45 -right-45 w-[650px] h-[650px] bg-purple-650/5 rounded-full blur-[160px] animate-pulse delay-700" />
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff05_1px,transparent_1px)] [background-size:24px_24px] opacity-75" />
    </div>
  );

  // ─── Success Screen ───────────────────────────────────────────
  if (step === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 relative overflow-hidden">
        {renderBackground()}
        <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in duration-500 p-[1.5px] rounded-[2.5rem] bg-gradient-to-b from-primary/30 via-zinc-800 to-zinc-900/50 shadow-[0_0_50px_rgba(0,0,0,0.85)]">
          <Card className="border-none bg-zinc-950/80 backdrop-blur-2xl rounded-[2.4rem] overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/[0.015] to-white/0 pointer-events-none" />
            <CardHeader className="items-center text-center pb-2 pt-8">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900/80 border border-zinc-850 shadow-[inset_0_1px_rgba(255,255,255,0.05)] overflow-hidden">
                <CheckCircle className="h-7 w-7 text-primary animate-bounce" />
              </div>
              <CardTitle className="text-2xl font-black text-white tracking-tight">
                Account Verified!
              </CardTitle>
              <CardDescription className="text-zinc-400 text-xs font-medium px-4">
                Your account has been successfully created and verified. You can now log in using your email and password.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 md:px-8 pb-8 pt-4">
              <Link
                href={
                  inviteToken
                    ? `/login?invite=${encodeURIComponent(inviteToken)}`
                    : "/login"
                }
              >
                <Button className="h-11 w-full bg-gradient-to-r from-primary to-blue-600 hover:from-primary/95 hover:to-blue-500 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.25)] text-xs uppercase tracking-wider">
                  Go to Sign in
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ─── OTP Input Screen ─────────────────────────────────────────
  if (step === "otp" || step === "sending") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 relative overflow-hidden">
        {renderBackground()}
        <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in duration-500 p-[1.5px] rounded-[2.5rem] bg-gradient-to-b from-primary/30 via-zinc-800 to-zinc-900/50 shadow-[0_0_50px_rgba(0,0,0,0.85)]">
          <Card className="border-none bg-zinc-950/80 backdrop-blur-2xl rounded-[2.4rem] overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/[0.015] to-white/0 pointer-events-none" />
            <CardHeader className="items-center text-center pb-2 pt-8">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900/80 border border-zinc-850 shadow-[inset_0_1px_rgba(255,255,255,0.05)] overflow-hidden">
                {step === "sending" ? (
                  <Loader2 className="h-7 w-7 text-primary animate-spin" />
                ) : (
                  <MessageSquare className="h-7 w-7 text-primary animate-pulse" />
                )}
              </div>
              <CardTitle className="text-2xl font-black text-white tracking-tight">
                {step === "sending" ? "Sending Code..." : "Enter Verification"}
              </CardTitle>
              <CardDescription className="text-zinc-400 text-xs font-medium px-4">
                {step === "sending"
                  ? "We are sending a verification code to your email..."
                  : (
                    <>We have sent a 6-digit code to <span className="text-white font-semibold">{email}</span>. Please enter the code below.</>
                  )
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 md:px-8 pb-8 pt-4">
              {step === "sending" ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
              ) : (
                <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
                  {error && (
                    <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-xs text-red-400 flex items-start gap-2.5 animate-in shake duration-200">
                      <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{error}</span>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="otp" className="text-zinc-400 text-xs font-semibold px-0.5">
                      6-Digit Code
                    </Label>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="123456"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      required
                      autoFocus
                      className="tracking-[0.5em] text-center text-xl font-bold border-zinc-800 bg-zinc-900/60 text-white rounded-xl placeholder:text-zinc-700 focus:border-primary focus:ring-1 focus:ring-primary/20 h-11 transition-all"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={otp.length !== 6}
                    className="mt-3 h-11 w-full bg-gradient-to-r from-primary to-blue-600 hover:from-primary/95 hover:to-blue-500 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.25)] text-xs uppercase tracking-wider"
                  >
                    Verify Code
                  </Button>

                  <div className="flex flex-col gap-3 items-center mt-3">
                    {resendTimer > 0 ? (
                      <p className="text-xs text-zinc-500 font-medium">
                        Resend code in {resendTimer}s
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendCode}
                        className="text-xs text-primary hover:text-primary/80 transition-colors font-bold"
                      >
                        Resend code
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setStep("form");
                        setOtp("");
                        setError(null);
                      }}
                      className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors font-semibold"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Back to Signup
                    </button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ─── Signup Form (Default) ────────────────────────────────────
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 relative overflow-hidden">
      {renderBackground()}
      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in duration-500 p-[1.5px] rounded-[2.5rem] bg-gradient-to-b from-primary/30 via-zinc-800 to-zinc-900/50 shadow-[0_0_50px_rgba(0,0,0,0.85)]">
        <Card className="border-none bg-zinc-950/80 backdrop-blur-2xl rounded-[2.4rem] overflow-hidden relative">
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
                {inviteToken ? "Create account & join" : "Avorex Technologies"}
              </CardTitle>
              <CardDescription className="text-zinc-400 text-xs font-medium">
                {inviteToken
                  ? "Verify your email, then accept the invitation to join your team."
                  : "WhatsApp CRM & Automation Platform"}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="px-6 md:px-8 pb-8 pt-4">
            <form onSubmit={handleSignup} className="flex flex-col gap-4">
              {error && (
                <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-xs text-red-400 flex items-start gap-2.5 animate-in shake duration-200">
                  <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fullName" className="text-zinc-400 text-xs font-semibold px-0.5">
                  Full Name
                </Label>
                <div className="relative">
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="pl-10 border-zinc-800 bg-zinc-900/60 text-white rounded-xl placeholder:text-zinc-600 focus:border-primary focus:ring-1 focus:ring-primary/20 text-sm h-11 transition-all"
                  />
                  <User className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
                </div>
              </div>

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
                <Label htmlFor="password" className="text-zinc-400 text-xs font-semibold px-0.5">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 pr-10 border-zinc-800 bg-zinc-900/60 text-white rounded-xl placeholder:text-zinc-600 focus:border-primary focus:ring-1 focus:ring-primary/20 text-sm h-11 transition-all"
                  />
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-zinc-500 hover:text-white cursor-pointer focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirmPassword" className="text-zinc-400 text-xs font-semibold px-0.5">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="pl-10 pr-10 border-zinc-800 bg-zinc-900/60 text-white rounded-xl placeholder:text-zinc-600 focus:border-primary focus:ring-1 focus:ring-primary/20 text-sm h-11 transition-all"
                  />
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-3.5 text-zinc-500 hover:text-white cursor-pointer focus:outline-none"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="mt-3 h-11 w-full bg-gradient-to-r from-primary to-blue-600 hover:from-primary/95 hover:to-blue-500 text-white font-bold rounded-xl gap-1.5 transition-all shadow-[0_0_20px_rgba(59,130,246,0.25)] hover:shadow-[0_0_25px_rgba(59,130,246,0.35)] active:scale-98 text-xs uppercase tracking-wider"
              >
                Create account
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-zinc-500 font-medium">
              Already have an account?{" "}
              <Link
                href={
                  inviteToken
                    ? `/login?invite=${encodeURIComponent(inviteToken)}`
                    : "/login"
                }
                className="text-primary hover:text-primary/80 font-bold transition-colors"
              >
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
