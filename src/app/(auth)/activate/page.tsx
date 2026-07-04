"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  KeyRound,
  LogOut,
  CheckCircle,
  Zap,
  Sparkles,
  Crown,
  AlertTriangle,
  Shield,
  ArrowRight,
  Star,
  Lock,
  Copy,
  Check,
  Smartphone,
  PhoneCall,
  Loader2,
  Gift,
  X,
  AlertCircle,
  ShieldCheck
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PackageData {
  id: string;
  name: string;
  code: string;
  features: string[];
  price: string;
  price_bdt: number;
  duration_days: number;
  device_limit: number;
  popular_badge: boolean;
  display_order: number;
  allowed_menus: string[];
  is_active: boolean;
}

interface BrandingConfig {
  software_name: string;
  brand_name: string;
  support_whatsapp: string;
  bkash_number: string;
  nagad_number: string;
  rocket_number: string;
  payment_instruction: string;
  currency: string;
  currency_symbol: string;
  payment_type: string;
}

type DecisionTree =
  | "NO_PLAN"
  | "NO_LICENSE"
  | "ACTIVE_PLAN_VERIFIED"
  | "EXPIRED"
  | "SUSPENDED_OR_REVOKED"
  | "PACKAGE_MISMATCH"
  | "DEVICE_NOT_AUTHORIZED"
  | string;

function maskKey(key: string) {
  if (!key) return "";
  const trimmed = key.trim();
  if (!trimmed.includes("-")) return trimmed;
  const parts = trimmed.split("-");
  if (parts.length !== 4) return trimmed;
  return `${parts[0]}-••••-••••-${parts[3]}`;
}

function ActivatePageInner() {
  const router = useRouter();
  const { refreshProfile, account, user, loading: authLoading } = useAuth();

  const [licenseDecisionTree, setLicenseDecisionTree] = useState<DecisionTree | null>(null);
  const [licenseValidateLoading, setLicenseValidateLoading] = useState(true);
  const [activateError, setActivateError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Backend-driven decision tree
  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (authLoading) return;
      if (!user) return;

      // bypass gating for platform admin
      if (user?.email === "admin@avorex.com") {
        setLicenseDecisionTree("ACTIVE_PLAN_VERIFIED");
        setLicenseValidateLoading(false);
        return;
      }

      setLicenseValidateLoading(true);
      setActivateError(null);

      try {
        const res = await fetch("/api/license/validate", { method: "GET" });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        setLicenseDecisionTree((data?.decisionTree as DecisionTree) ?? "ERROR");
      } catch {
        if (cancelled) return;
        setLicenseDecisionTree("ERROR");
      } finally {
        if (!cancelled) setLicenseValidateLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  // Redirect or auto-open key modal based on decisionTree
  useEffect(() => {
    if (licenseValidateLoading) return;
    if (!licenseDecisionTree) return;

    if (licenseDecisionTree === "ACTIVE_PLAN_VERIFIED") {
      // Active plan verified → go directly to dashboard
      router.push("/dashboard");
      return;
    }

    if (licenseDecisionTree === "EXPIRED") return;
    if (licenseDecisionTree === "SUSPENDED_OR_REVOKED") return;

    // For any other paid-state issues, force "Enter License Key" popup
    // and hide the package purchase selection.
    if (
      licenseDecisionTree === "NO_LICENSE" ||
      licenseDecisionTree === "PACKAGE_MISMATCH" ||
      licenseDecisionTree === "DEVICE_NOT_AUTHORIZED"
    ) {
      setShowKeyModal(true);
    }
  }, [licenseValidateLoading, licenseDecisionTree, router]);

  // App configurations
  const [branding, setBranding] = useState<BrandingConfig>({
    software_name: "Avorex Whatsapp Automation",
    brand_name: "Avorex",
    support_whatsapp: "01575813644",
    bkash_number: "+8801754967976",
    nagad_number: "+8801754967976",
    rocket_number: "+8801754967976",
    payment_instruction: "আপনার নির্বাচিত প্যাকেজের নির্ধারিত টাকা bKash, Nagad অথবা Rocket-এর মাধ্যমে Send Money করুন। টাকা পাঠানোর পর Transaction ID নিচে লিখে সাবমিট করুন।",
    currency: "BDT",
    currency_symbol: "৳",
    payment_type: "Send Money"
  });

  const [licenseKey, setLicenseKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Realtime activation details
  const [successDetails, setSuccessDetails] = useState<{
    packageName: string;
    licenseKey: string;
    expiresAt: string | null;
  } | null>(null);

  const [packages, setPackages] = useState<PackageData[]>([]);
  const [fetchingPackages, setFetchingPackages] = useState(true);

  // Manual key entry modal
  const [showKeyModal, setShowKeyModal] = useState(false);

  // Manual payment modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<PackageData | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(1);
  const [selectedMethod, setSelectedMethod] = useState<"bKash" | "Nagad" | "Rocket" | null>(null);
  const [senderNumber, setSenderNumber] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [copiedMethod, setCopiedMethod] = useState<string | null>(null);

  // Calculate price dynamically based on duration and discount
  useEffect(() => {
    if (selectedPkg) {
      let discount = 0;
      if (selectedDuration === 3) discount = 0.05;
      else if (selectedDuration === 6) discount = 0.10;
      else if (selectedDuration === 12) discount = 0.20;

      const calculated = Math.round(selectedPkg.price_bdt * selectedDuration * (1 - discount));
      setPaidAmount(calculated.toString());
    }
  }, [selectedPkg, selectedDuration]);

  // Submitted request details (for WhatsApp action)
  const [submittedRequest, setSubmittedRequest] = useState<any | null>(null);

  const supabase = createClient();

  // Load Packages and Branding configurations
  useEffect(() => {
    const loadInitData = async () => {
      try {
        // Fetch Branding
        const brandRes = await fetch("/api/admin/branding-settings");
        if (brandRes.ok) {
          const brandData = await brandRes.json();
          if (brandData.id) setBranding(brandData);
        }

        // Fetch Packages
        const pkgRes = await fetch("/api/packages");
        if (pkgRes.ok) {
          const pkgData = await pkgRes.json();
          const activePkgs = (pkgData || []).filter((p: any) => p.is_active !== false);
          if (activePkgs.length > 0) {
            setPackages(activePkgs);
          } else {
            throw new Error("No active packages");
          }
        } else {
          throw new Error("Failed to load packages");
        }
      } catch {
        // Fallbacks
        setPackages([
          {
            id: "6b5089ce-1616-4984-bb60-183c870046fb",
            name: "Starter",
            code: "Standard",
            features: ["Dashboard", "Basic Inbox", "Contacts", "Notifications", "1 WhatsApp Connection", "Basic Messaging"],
            price: "৳499 BDT",
            price_bdt: 499,
            duration_days: 30,
            device_limit: 1,
            popular_badge: false,
            display_order: 1,
            allowed_menus: ["dashboard", "inbox", "notifications", "contacts"],
            is_active: true
          },
          {
            id: "fc74b0e1-5510-49ce-b906-12ecd80c88f4",
            name: "Premium",
            code: "Premium",
            features: ["Everything in Starter", "Pipelines & Deals", "Broadcasts", "Automations", "Flows", "Up to 3 WhatsApp Connections", "Visual Flow Editor"],
            price: "৳999 BDT",
            price_bdt: 999,
            duration_days: 30,
            device_limit: 3,
            popular_badge: true,
            display_order: 2,
            allowed_menus: ["dashboard", "inbox", "notifications", "contacts", "pipelines", "broadcasts", "automations", "flows"],
            is_active: true
          },
          {
            id: "93b8617e-9a58-458b-b918-b55b261f4182",
            name: "Max",
            code: "Enterprise",
            features: ["Full software access", "All current and future modules", "AI Agents", "Unlimited WhatsApp Channels", "Priority Support", "Custom Integrations"],
            price: "৳1,499 BDT",
            price_bdt: 1499,
            duration_days: 30,
            device_limit: 99,
            popular_badge: false,
            display_order: 3,
            allowed_menus: ["dashboard", "inbox", "notifications", "contacts", "pipelines", "broadcasts", "automations", "flows", "agents"],
            is_active: true
          },
        ]);
      } finally {
        setFetchingPackages(false);
      }
    };

    loadInitData();
  }, []);

  // Set up Supabase Realtime listener to watch user's account license activation
  useEffect(() => {
    if (!account?.id) return;

    const channel = supabase
      .channel("user-license-check")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "accounts",
          filter: `id=eq.${account.id}`
        },
        async (payload: any) => {
          if (payload.new && payload.new.license_key) {
            setSuccessDetails({
              packageName: payload.new.plan,
              licenseKey: payload.new.license_key,
              expiresAt: payload.new.license_expires_at
            });
            setSuccess(true);
            await refreshProfile();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [account?.id, supabase]);

  // Activate license using key directly
  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!licenseKey.trim()) {
      setError("Please enter a license key");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: licenseKey.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to activate license key");
      }

      setSuccessDetails({
        packageName: data.plan,
        licenseKey: licenseKey.trim(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // estimate
      });
      setSuccess(true);
      toast.success(`License activated! Package: ${data.plan}`);

      await refreshProfile();
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please check your key.");
    } finally {
      setLoading(false);
    }
  };

  // Submit payment request
  const handleSubmitPaymentRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg || !selectedMethod || !senderNumber.trim() || !transactionId.trim() || !paidAmount.trim()) {
      toast.error("সবগুলো প্রয়োজনীয় তথ্য পূরণ করুন।");
      return;
    }

    setSubmittingPayment(true);
    try {
      const res = await fetch("/api/payment-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: selectedPkg.id,
          paymentMethod: selectedMethod,
          senderNumber: senderNumber.trim(),
          transactionId: transactionId.trim(),
          paidAmount: Number(paidAmount),
          paymentNote: paymentNote.trim(),
          durationMonths: selectedDuration
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "পেমেন্ট সাবমিট করা যায়নি");
      }

      setSubmittedRequest(data.data);
      toast.success("পেমেন্ট রিকোয়েস্ট জমা হয়েছে।");
      // clear inputs
      setSenderNumber("");
      setTransactionId("");
      setPaidAmount("");
      setPaymentNote("");
    } catch (err: any) {
      toast.error(err.message || "পেমেন্ট রিকোয়েস্ট সাবমিট করা যায়নি। সঠিক তথ্য দিন।");
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleCopyNumber = (method: "bKash" | "Nagad" | "Rocket") => {
    let number = branding.bkash_number;
    if (method === "Nagad") number = branding.nagad_number;
    if (method === "Rocket") number = branding.rocket_number;

    navigator.clipboard.writeText(number);
    setCopiedMethod(method);
    toast.success("নাম্বার কপি হয়েছে");
    setTimeout(() => setCopiedMethod(null), 2000);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const openCheckout = (pkg: PackageData) => {
    setSelectedPkg(pkg);
    setSelectedDuration(1);
    setPaidAmount(pkg.price_bdt.toString());
    setSelectedMethod("bKash");
    setSubmittedRequest(null);
    setShowPaymentModal(true);
  };

  const getPackageConfig = (code: string) => {
    switch (code) {
      case "Max":
      case "Enterprise":
        return {
          icon: <Crown className="h-5 w-5 text-violet-400 animate-pulse" />,
          gradient: "from-violet-650 via-purple-600 to-fuchsia-600",
          cardBg: "bg-gradient-to-br from-indigo-950/50 via-purple-950/90 to-fuchsia-950/50 group-hover:from-indigo-900/70 group-hover:via-purple-950 group-hover:to-fuchsia-900/70",
          glowColor: "from-violet-600/40 via-purple-600/30 to-fuchsia-600/40",
          border: "border-violet-500/20 group-hover:border-violet-500/45",
          badge: "bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.35)] border-white/10",
          checkColor: "text-violet-400",
          priceText: "text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400",
          buttonBg: "bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] shadow-[0_0_15px_rgba(139,92,246,0.2)]",
          label: "ENTERPRISE",
          featureBg: "bg-violet-500/[0.03] border-violet-500/10 hover:bg-violet-500/[0.08]",
        };
      case "Premium":
        return {
          icon: <Zap className="h-5 w-5 text-blue-400 animate-pulse" />,
          gradient: "from-blue-600 via-cyan-600 to-teal-600",
          cardBg: "bg-gradient-to-br from-blue-950/50 via-sky-950/90 to-teal-950/50 group-hover:from-blue-900/70 group-hover:via-sky-950 group-hover:to-teal-900/70",
          glowColor: "from-blue-600/40 via-cyan-600/30 to-teal-600/40",
          border: "border-blue-500/20 group-hover:border-blue-500/45",
          badge: "bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.35)] border-white/10",
          checkColor: "text-blue-400",
          priceText: "text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400",
          buttonBg: "bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 hover:from-blue-500 hover:to-teal-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] shadow-[0_0_15px_rgba(59,130,246,0.2)]",
          label: "RECOMMENDED",
          featureBg: "bg-blue-500/[0.03] border-blue-500/10 hover:bg-blue-500/[0.08]",
        };
      default:
        return {
          icon: <Sparkles className="h-5 w-5 text-emerald-400 animate-pulse" />,
          gradient: "from-emerald-600 to-teal-600",
          cardBg: "bg-gradient-to-br from-emerald-950/40 via-zinc-950/90 to-teal-950/40 group-hover:from-emerald-900/60 group-hover:via-zinc-950 group-hover:to-teal-900/60",
          glowColor: "from-emerald-600/30 to-teal-600/30",
          border: "border-emerald-500/20 group-hover:border-emerald-500/35",
          badge: "bg-zinc-800 text-zinc-300 border-zinc-700",
          checkColor: "text-emerald-400",
          priceText: "text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400",
          buttonBg: "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] shadow-[0_0_15px_rgba(16,185,129,0.15)]",
          label: "STARTER",
          featureBg: "bg-emerald-500/[0.03] border-emerald-500/10 hover:bg-emerald-500/[0.08]",
        };
    }
  };

  const getWhatsAppLink = () => {
    if (!submittedRequest || !user) return "";

    const message = `আসসালামু আলাইকুম, আমি সফটওয়্যারের একটি প্যাকেজের জন্য পেমেন্ট করেছি। অনুগ্রহ করে আমার পেমেন্টটি যাচাই করে লাইসেন্স অ্যাক্টিভ করে দিন।

আমার তথ্য:
নাম: ${submittedRequest.user_name}
ইমেইল: ${submittedRequest.user_email}
প্যাকেজ: ${submittedRequest.package_name}
প্যাকেজের মেয়াদ: ${submittedRequest.package_duration}
পেমেন্ট মাধ্যম: ${submittedRequest.payment_method}
পেমেন্টের পরিমাণ: ৳${submittedRequest.paid_amount} BDT
Sender Number: ${submittedRequest.sender_number}
Transaction ID: ${submittedRequest.transaction_id}
Request ID: ${submittedRequest.request_id}

আমি পেমেন্ট সম্পন্ন করেছি। অনুগ্রহ করে Transaction ID যাচাই করে আমার লাইসেন্সটি অ্যাক্টিভ করে দিন। ধন্যবাদ।`;

    return `https://wa.me/88${branding.support_whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(message)}`;
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-background to-emerald-500/5" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-emerald-400/15 rounded-full blur-[100px] animate-pulse delay-700" />

        <div className="relative w-full max-w-lg z-10 p-0.5 rounded-[32px] bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.3)] animate-in zoom-in duration-300">
          <Card className="border-none bg-zinc-950 text-left p-6 md:p-8 rounded-[30px] overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent pointer-events-none" />

            {/* Header Success */}
            <div className="flex flex-col items-center text-center pb-6 border-b border-zinc-900">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/25 animate-bounce">
                <CheckCircle className="h-9 w-9 text-emerald-500" />
              </div>
              <CardTitle className="text-2xl font-black text-foreground">
                অভিনন্দন! আপনার লাইসেন্স অ্যাক্টিভ হয়েছে
              </CardTitle>
              <p className="text-emerald-500 mt-2 text-sm font-semibold">
                পেমেন্ট সফলভাবে অনুমোদিত হয়েছে
              </p>
            </div>

            {/* Premium Digital License Card */}
            <div className="mt-6 p-5 border border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 via-zinc-900/50 to-zinc-950 rounded-2xl space-y-3.5 relative overflow-hidden shadow-inner">
              <div className="absolute top-0 right-0 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl border-l border-b border-emerald-500/20">
                ACTIVE
              </div>

              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <Gift className="h-4.5 w-4.5" />
                </div>
                <span className="text-xs font-bold text-emerald-400/90 uppercase tracking-widest">{branding.software_name}</span>
              </div>

              <div>
                <span className="text-[10px] text-zinc-500 block uppercase tracking-wider">Package Plan</span>
                <span className="text-lg font-black text-white">{successDetails?.packageName || "Premium Plan"}</span>
              </div>

              <div>
                <span className="text-[10px] text-zinc-500 block uppercase tracking-wider">Digital License Key</span>
                <span className="font-mono text-sm font-black text-emerald-400 block tracking-wider bg-zinc-950/80 p-2 border border-zinc-900 rounded-lg select-all">
                  {successDetails?.licenseKey || "AVX-XXXX-XXXX-XXXX"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div>
                  <span className="text-[9px] text-zinc-500 block uppercase tracking-wider">Activated on</span>
                  <span className="font-semibold text-zinc-300">{new Date().toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-[9px] text-zinc-500 block uppercase tracking-wider">Expires on</span>
                  <span className="font-semibold text-zinc-300">
                    {successDetails?.expiresAt ? new Date(successDetails.expiresAt).toLocaleDateString() : "No Expiry"}
                  </span>
                </div>
              </div>
            </div>

            {/* Action */}
            <div className="mt-8">
              <Button
                onClick={() => router.push("/dashboard")}
                className="w-full h-13 rounded-2xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/20 transition-all hover:scale-102"
              >
                ড্যাশবোর্ড প্রবেশ করুন (Start Using Software)
                <ArrowRight className="h-4.5 w-4.5 ml-1.5" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col px-4 py-4 md:py-6">
      {/* Premium background radial gradient + mesh grid */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-30 -left-30 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-[650px] h-[650px] bg-purple-650/5 rounded-full blur-[160px] animate-pulse delay-700" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:20px_20px] opacity-60" />
      </div>

      {/* Top Navigation Bar: Sticky-style & Compact */}
      <div className="w-full max-w-6xl mx-auto flex items-center justify-between border-b border-zinc-900/60 pb-3 mb-6 relative z-10 animate-in fade-in slide-in-from-top-2 duration-400 fill-mode-both">
        {/* Left: Branding */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center text-primary shadow-[inset_0_1px_rgba(255,255,255,0.05)]">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <span className="text-sm font-black text-white tracking-wider">{branding.brand_name} CRM</span>
        </div>

        {/* Right Action buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowKeyModal(true)}
            className="bg-primary/15 hover:bg-primary/25 border border-primary/20 text-primary text-xs font-bold px-4 h-9 rounded-xl flex items-center gap-1.5 transition-all shadow-[inset_0_1px_rgba(255,255,255,0.05)] active:scale-95 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]"
          >
            <KeyRound className="h-3.5 w-3.5 animate-pulse" />
            Enter License Key
          </button>

          <div className="h-4 w-[1px] bg-zinc-800" />

          <button
            onClick={handleSignOut}
            className="text-zinc-500 hover:text-destructive text-xs font-bold px-2.5 h-9 rounded-xl flex items-center gap-1.5 transition-all active:scale-95"
            title={`Logged in as ${user?.email}`}
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col justify-center gap-6 relative z-10">

        {/* Small Header Section */}
        <div className="text-center space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
          <h1 className="text-2xl md:text-4xl font-black text-foreground tracking-tight text-white">
            Activate Your License
          </h1>
          <p className="text-zinc-400 max-w-lg mx-auto text-xs leading-relaxed">
            একটি প্ল্যান বেছে নিয়ে bKash, Nagad বা Rocket এর মাধ্যমে পেমেন্ট সম্পন্ন করে লাইসেন্স কী সক্রিয় করুন।
          </p>
        </div>

        {/* Dynamic Package Cards Grid */}
        {licenseDecisionTree !== "ACTIVE_PLAN_VERIFIED" && (
          <>
            {fetchingPackages ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-2xl border border-border/20 bg-card/40 p-5 space-y-4 animate-pulse">
                    <div className="h-4 bg-muted rounded w-20" />
                    <div className="h-6 bg-muted rounded w-16" />
                    <div className="space-y-2 mt-4">
                      {[1, 2, 3].map((j) => (
                        <div key={j} className="h-2.5 bg-muted rounded w-full" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
                {packages.map((pkg, index) => {
                  const config = getPackageConfig(pkg.code);

                  return (
                    <div
                      key={pkg.id}
                      className="relative group rounded-[2rem] transition-all duration-500 cursor-default flex flex-col animate-in fade-in slide-in-from-bottom-8 fill-mode-both"
                      style={{ animationDelay: `${index * 120}ms`, animationDuration: "600ms" }}
                    >
                      {/* Outer Premium Neon Glow Aura - pulses when hovered */}
                      <div className={cn(
                        "absolute -inset-[1px] bg-gradient-to-r rounded-[2rem] blur-md opacity-25 group-hover:opacity-90 transition duration-700 ease-out group-hover:blur-lg pointer-events-none group-hover:animate-pulse",
                        config.glowColor
                      )} />

                      {/* Card Main Outer Border gradient holder */}
                      <div className={cn(
                        "relative flex-1 flex flex-col rounded-[2rem] p-[1.2px] bg-gradient-to-b from-zinc-800/80 to-zinc-900/30 group-hover:from-zinc-700/80 group-hover:to-zinc-800/30 transition-all duration-500 overflow-hidden",
                        config.border
                      )}>

                        {/* Inner Card glass container */}
                        <div className={cn("relative flex-1 flex flex-col justify-between rounded-[1.95rem] p-6 transition-all duration-500 overflow-hidden", config.cardBg)}>

                          {/* Sweeping diagonal light reflection */}
                          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/[0.03] to-white/0 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out pointer-events-none" />

                          <div>
                            {/* Name & Badge */}
                            <div className="flex items-center justify-between mb-4">
                              <span className={cn(
                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-[8px] font-black uppercase tracking-widest border border-white/5",
                                config.badge
                              )}>
                                {config.label}
                              </span>

                              <div className="h-8.5 w-8.5 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-center text-white shadow-lg group-hover:scale-105 group-hover:rotate-[360deg] transition-all duration-700">
                                {config.icon}
                              </div>
                            </div>

                            {/* Title & Price */}
                            <div className="space-y-1 mb-5">
                              <h3 className="text-xl font-black text-white tracking-tight">{pkg.name}</h3>
                              <div className="flex items-baseline gap-1">
                                <span className={cn("text-3xl font-black tracking-tight", config.priceText)}>৳{pkg.price_bdt}</span>
                                <span className="text-[10px] text-zinc-500 font-bold tracking-wider">BDT / {pkg.duration_days} Days</span>
                              </div>
                            </div>

                            {/* Features Tags List */}
                            <div className="border-t border-zinc-900/80 pt-4 mb-5">
                              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-2.5">Included features:</span>
                              <ul className="space-y-2">
                                {pkg.features?.map((feat, i) => (
                                  <li
                                    key={i}
                                    className={cn(
                                      "text-[11px] text-zinc-300 flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-transparent transition-all duration-300 group-hover:translate-x-0.5",
                                      config.featureBg
                                    )}
                                  >
                                    <CheckCircle className={cn("h-4 w-4 shrink-0 mt-0 transition-transform duration-300 hover:scale-110", config.checkColor || "text-emerald-400")} />
                                    <span className="leading-none">{feat}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {/* Button Buy */}
                          <Button
                            onClick={() => openCheckout(pkg)}
                            className={cn(
                              "w-full h-11 text-white font-black text-xs rounded-xl gap-1 mt-2 transition-all border border-white/5 active:scale-97 select-none hover:scale-102",
                              config.buttonBg
                            )}
                          >
                            প্যাকেজটি কিনুন (Buy Package)
                          </Button>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Small Bottom Info */}
        <div className="text-center pt-2 animate-in fade-in duration-700 fill-mode-both" style={{ animationDelay: "600ms" }}>
          <a
            href={`https://wa.me/88${branding.support_whatsapp.replace(/[^0-9]/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-emerald-400 transition-colors font-semibold"
          >
            <PhoneCall className="h-3 w-3 text-emerald-500 animate-pulse" />
            পেমেন্ট বা লাইসেন্স নিয়ে সমস্যা? এডমিনকে জানান (WhatsApp Support)
          </a>
        </div>
      </div>

      {/* Joss License Key Input Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-300">
          {/* Ambient glow orbs */}
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-purple-600/10 rounded-full blur-[80px] pointer-events-none animate-pulse" />

          <div className="relative w-full max-w-md animate-in zoom-in-95 fade-in duration-300">
            {/* Outer gradient glow border */}
            <div className="absolute -inset-[1px] rounded-[2.8rem] bg-gradient-to-br from-primary/60 via-purple-500/40 to-fuchsia-500/60 blur-sm opacity-50 pointer-events-none" />

            {/* Main card wrapper */}
            <div className="relative p-[1.2px] rounded-[2.8rem] bg-gradient-to-br from-white/20 via-primary/30 to-purple-500/30">
              <div className="relative bg-zinc-950/98 backdrop-blur-2xl rounded-[2.7rem] overflow-hidden">

                {/* Top decorative gradient bar */}
                <div className="h-[3px] w-full bg-gradient-to-r from-transparent via-primary to-transparent" />

                {/* Close Button */}
                <button
                  onClick={() => { setShowKeyModal(false); setError(null); setLicenseKey(""); }}
                  className="absolute top-5 right-5 h-9 w-9 rounded-full border border-zinc-800/80 bg-zinc-900/80 backdrop-blur-sm flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 hover:border-zinc-700 transition-all duration-200 z-10 group"
                >
                  <X className="h-4 w-4 group-hover:rotate-90 transition-transform duration-200" />
                </button>

                {/* Header section */}
                <div className="text-center pt-10 pb-2 px-8">
                  {/* Animated key icon */}
                  <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center">
                    {/* Outer ring pulse */}
                    <div className="absolute inset-0 rounded-2xl border-2 border-primary/20 animate-ping duration-[2000ms] opacity-20" />
                    {/* Middle glow */}
                    <div className="absolute inset-0 rounded-2xl bg-primary/5 blur-md" />
                    {/* Icon container */}
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-purple-600/20 border border-primary/25 shadow-[0_0_30px_rgba(59,130,246,0.15)]">
                      <KeyRound className="h-7 w-7 text-primary" />
                    </div>
                  </div>

                  <h2 className="text-xl font-black text-white tracking-tight leading-tight">
                    {'লাইসেন্স কী এন্টার করুন'}
                  </h2>
                  <p className="text-[11px] text-zinc-500 mt-2 max-w-[260px] mx-auto leading-relaxed">
                    {'আপনার লাইসেন্স কী পেস্ট করুন অথবা ম্যানুয়লি টাইপ করুন।'}
                  </p>
                </div>

                {/* Form section */}
                <div className="px-8 pb-9 pt-5">
                  <form onSubmit={handleActivate} className="space-y-5">
                    {error && (
                      <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/[0.07] px-4 py-3 text-xs text-red-400 animate-in shake duration-200">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{error}</span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="licenseKey" className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] pl-1">
                        License Key
                      </Label>
                      <div className="relative group">
                        <Input
                          id="licenseKey"
                          placeholder="AVX-XXXX-XXXX-XXXX"
                          value={licenseKey}
                          onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                          required
                          disabled={loading}
                          className="text-center font-mono uppercase rounded-2xl border-zinc-800/80 bg-zinc-900/70 focus:border-primary/60 text-lg h-14 tracking-[0.25em] text-white placeholder:text-zinc-700 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] focus:shadow-[0_0_0_2px_rgba(59,130,246,0.15),inset_0_2px_4px_rgba(0,0,0,0.3)] transition-all duration-200"
                        />
                        {/* Subtle bottom accent line */}
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 group-focus-within:w-3/4 h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent transition-all duration-500" />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading || !licenseKey.trim()}
                      className="relative w-full h-13 rounded-2xl text-sm font-black tracking-wide overflow-hidden transition-all duration-300 active:scale-[0.98]"
                    >
                      {/* Button gradient background */}
                      <div className="absolute inset-0 bg-gradient-to-r from-primary via-blue-600 to-purple-600 transition-all duration-300" />
                      <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-600 to-fuchsia-600 opacity-0 hover:opacity-100 transition-opacity duration-300" />
                      {/* Glow effect */}
                      <div className="absolute inset-0 shadow-[0_0_25px_rgba(59,130,246,0.25)] rounded-2xl" />

                      <span className="relative flex items-center gap-2 text-white">
                        {loading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <>
                            {'লাইসেন্স সক্রিয় করুন'}
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </span>
                    </Button>
                  </form>

                  {/* Footer */}
                  <div className="mt-5 pt-4 border-t border-zinc-900/60 flex items-center justify-center">
                    <button
                      onClick={() => { setShowKeyModal(false); setError(null); setLicenseKey(""); }}
                      className="text-zinc-600 hover:text-zinc-300 text-xs font-semibold transition-colors duration-200"
                    >
                      {'বন্ধ করুন'}
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
      {/* Manual Payment Checkout Modal */}
      {showPaymentModal && selectedPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl animate-in scale-in duration-200 max-h-[95vh] overflow-y-auto">
            <Card className="border-zinc-850 bg-zinc-950 shadow-2xl rounded-3xl overflow-hidden">
              <div className="h-1.5 w-full bg-primary" />
              <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-900 pb-4 pt-5 px-6">
                <div>
                  <CardTitle className="text-base font-black text-foreground">পেমেন্ট চেকআউট (Checkout)</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">ম্যানুয়ালি পেমেন্ট করে লাইসেন্সের জন্য সাবমিট করুন</p>
                </div>
                <Button onClick={() => setShowPaymentModal(false)} variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-foreground rounded-full">
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {submittedRequest ? (
                  /* Request submitted success card */
                  <div className="space-y-5 animate-in fade-in duration-300">
                    <div className="p-4 border border-amber-500/20 bg-amber-500/5 rounded-2xl flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0 animate-pulse" />
                      <div>
                        <h4 className="text-sm font-black text-amber-500">রিকোয়েস্ট জমা হয়েছে (Pending Verification)</h4>
                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                          আপনার পেমেন্ট রিকোয়েস্ট সফলভাবে জমা হয়েছে। অ্যাডমিন যাচাই করার পর আপনার লাইসেন্স অ্যাক্টিভ হবে।
                        </p>
                      </div>
                    </div>

                    <div className="bg-zinc-900/60 border border-zinc-900 rounded-2xl p-4 text-xs space-y-2.5">
                      <div className="flex justify-between"><span className="text-zinc-500">প্যাকেজ:</span> <span className="font-semibold text-white">{submittedRequest.package_name}</span></div>
                      <div className="flex justify-between"><span className="text-zinc-500">পরিশোধিত টাকা:</span> <span className="font-bold text-white">৳{submittedRequest.paid_amount} BDT</span></div>
                      <div className="flex justify-between"><span className="text-zinc-500">পেমেন্ট মাধ্যম:</span> <span className="font-semibold text-white uppercase">{submittedRequest.payment_method}</span></div>
                      <div className="flex justify-between"><span className="text-zinc-500">Transaction ID:</span> <span className="font-mono font-bold text-primary">{submittedRequest.transaction_id}</span></div>
                      <div className="flex justify-between"><span className="text-zinc-500">রিকোয়েস্ট আইডি:</span> <span className="font-mono font-bold text-zinc-400">{submittedRequest.request_id}</span></div>
                    </div>

                    <div className="space-y-2.5">
                      <a
                        href={getWhatsAppLink()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full h-11 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/10 hover:shadow-emerald-500/25 transition-all text-sm"
                      >
                        <PhoneCall className="h-4.5 w-4.5" />
                        WhatsApp-এ Admin-কে জানান
                      </a>
                      <Button
                        onClick={() => setShowPaymentModal(false)}
                        variant="ghost"
                        className="w-full text-xs text-zinc-500 hover:text-foreground h-9"
                      >
                        বন্ধ করুন
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Checkout Form */
                  <form onSubmit={handleSubmitPaymentRequest} className="space-y-5">
                    {/* Package summary info */}
                    <div className="bg-zinc-900/50 border border-zinc-900 rounded-2xl p-4 flex justify-between items-center text-sm">
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Selected Package</span>
                        <span className="font-black text-foreground text-base">{selectedPkg.name}</span>
                        <span className="text-xs text-zinc-400 block mt-0.5">মেয়াদ: {selectedDuration === 12 ? "1 Year" : `${selectedDuration} Month${selectedDuration > 1 ? "s" : ""}`}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Total Payment</span>
                        <span className="font-black text-white text-lg">৳{paidAmount} BDT</span>
                        {selectedDuration > 1 && (
                          <span className="text-[9px] text-emerald-400 block mt-0.5 font-bold">
                            ({selectedDuration === 3 ? "5%" : selectedDuration === 6 ? "10%" : "20%"} Discount Applied)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Duration Selector segment grid */}
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase text-zinc-400">মেয়াদ নির্বাচন করুন (Select Duration)</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {([
                          { months: 1, label: "1 Month", discount: "Regular" },
                          { months: 3, label: "3 Months", discount: "5% Off" },
                          { months: 6, label: "6 Months", discount: "10% Off" },
                          { months: 12, label: "1 Year", discount: "20% Off" }
                        ]).map((d) => (
                          <button
                            key={d.months}
                            type="button"
                            onClick={() => setSelectedDuration(d.months)}
                            className={cn(
                              "flex flex-col items-center justify-center py-2 px-1 border rounded-xl gap-0.5 transition-all hover:bg-zinc-900/60 active:scale-95 duration-200 select-none",
                              selectedDuration === d.months ? "border-primary bg-primary/10 text-white font-bold" : "border-zinc-850 bg-zinc-900/20 text-zinc-400"
                            )}
                          >
                            <span className="text-[11px] font-black">{d.label}</span>
                            <span className={cn(
                              "text-[9px] font-semibold",
                              d.months > 1 ? "text-emerald-400" : "text-zinc-500"
                            )}>{d.discount}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Payment Method Selector */}
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase text-zinc-400">পেমেন্ট মেথড সিলেক্ট করুন</Label>
                      <div className="grid grid-cols-3 gap-2.5">
                        {(["bKash", "Nagad", "Rocket"] as const).map((method) => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setSelectedMethod(method)}
                            className={cn(
                              "flex flex-col items-center justify-center py-3 px-1 border rounded-xl gap-1.5 transition-all hover:bg-zinc-900/60 active:scale-95 duration-200 select-none",
                              selectedMethod === method ? "border-primary bg-primary/10 text-white font-bold shadow-[0_0_15px_rgba(59,130,246,0.1)]" : "border-zinc-850 bg-zinc-900/20 text-zinc-400"
                            )}
                          >
                            <span className="text-xs font-black uppercase tracking-wider">{method}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Send Money Number instruction */}
                    {selectedMethod && (
                      <div className="bg-zinc-900/40 border border-zinc-900 p-4 rounded-2xl space-y-3.5">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-zinc-500 block uppercase tracking-wider">Send Money To</span>
                            <span className="font-mono text-lg font-black text-white tracking-widest">
                              {selectedMethod === "bKash" && branding.bkash_number}
                              {selectedMethod === "Nagad" && branding.nagad_number}
                              {selectedMethod === "Rocket" && branding.rocket_number}
                            </span>
                          </div>
                          <Button
                            type="button"
                            onClick={() => handleCopyNumber(selectedMethod)}
                            variant="ghost"
                            size="sm"
                            className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs border border-zinc-850 rounded-lg gap-1 px-3"
                          >
                            {copiedMethod === selectedMethod ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                            Copy Number
                          </Button>
                        </div>

                        <p className="text-xs text-amber-500/90 leading-relaxed border-t border-zinc-850/60 pt-3">
                          {branding.payment_instruction}
                        </p>
                      </div>
                    )}

                    {/* Inputs */}
                    <div className="space-y-3.5 pt-2">
                      <div className="grid grid-cols-2 gap-3.5">
                        <div className="space-y-1.5">
                          <Label htmlFor="sendNum">Sender Mobile Number</Label>
                          <Input
                            id="sendNum"
                            placeholder="01XXXXXXXXX"
                            value={senderNumber}
                            onChange={e => setSenderNumber(e.target.value.replace(/[^0-9]/g, ""))}
                            required
                            className="bg-zinc-900 border-zinc-800 font-mono"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="trxId">Transaction ID</Label>
                          <Input
                            id="trxId"
                            placeholder="TrxID (যেমন: K8X92NQM)"
                            value={transactionId}
                            onChange={e => setTransactionId(e.target.value)}
                            required
                            className="bg-zinc-900 border-zinc-800 font-mono uppercase"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3.5">
                        <div className="space-y-1.5">
                          <Label htmlFor="pAmount">Paid Amount (BDT ৳)</Label>
                          <Input
                            id="pAmount"
                            type="number"
                            placeholder="999"
                            value={paidAmount}
                            onChange={e => setPaidAmount(e.target.value)}
                            required
                            className="bg-zinc-900 border-zinc-800"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="pNote">Payment Note (Optional)</Label>
                          <Input
                            id="pNote"
                            placeholder="যেমন: রেফারেন্স বা পেমেন্ট নোট"
                            value={paymentNote}
                            className="bg-zinc-900 border-zinc-800"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Submit */}
                    <div className="pt-3 border-t border-zinc-900 flex gap-2 justify-end">
                      <Button
                        type="button"
                        onClick={() => setShowPaymentModal(false)}
                        variant="outline"
                        className="bg-zinc-900 border-zinc-800 text-zinc-300"
                      >
                        বাতিল
                      </Button>
                      <Button
                        type="submit"
                        disabled={submittingPayment}
                        className="bg-primary hover:bg-primary/95 text-white font-bold px-6 gap-1"
                      >
                        {submittingPayment ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : "Submit Payment Request"}
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ActivatePage() {
  return (
    <AuthProvider>
      <ActivatePageInner />
    </AuthProvider>
  );
}
