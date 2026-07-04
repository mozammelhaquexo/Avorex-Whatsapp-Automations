'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  KeyRound,
  Calendar,
  Clock,
  Shield,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Loader2,
  Monitor,
  Copy,
  Check
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SettingsPanelHead } from './settings-panel-head';
import { cn } from '@/lib/utils';
import { maskLicenseKey, getRemainingDays, formatRemainingTime } from '@/lib/license';
import { toast } from 'sonner';

interface LicenseInfo {
  licenseKey: string | null;
  plan: string | null;
  activatedAt: string | null;
  expiresAt: string | null;
  allowedMenus: string[] | null;
  packageName: string | null;
  packageFeatures: string[] | null;
}

export function LicenseInfoPanel() {
  const router = useRouter();
  const { account } = useAuth();
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchLicenseInfo = async () => {
      if (!account?.license_key) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/license/validate');
        if (res.ok) {
          const data = await res.json();
          setLicenseInfo({
            licenseKey: data.licenseKey || account.license_key,
            plan: data.plan || account.plan,
            activatedAt: data.activatedAt || account.license_activated_at,
            expiresAt: data.expiresAt || account.license_expires_at,
            allowedMenus: data.allowedMenus || account.allowed_menus,
            packageName: data.package?.name || null,
            packageFeatures: data.package?.features || null,
          });
        }
      } catch {
        // Fallback to account data
        setLicenseInfo({
          licenseKey: account.license_key,
          plan: account.plan,
          activatedAt: account.license_activated_at,
          expiresAt: account.license_expires_at,
          allowedMenus: account.allowed_menus,
          packageName: null,
          packageFeatures: null,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchLicenseInfo();
  }, [account]);

  const handleRenew = () => {
    router.push('/activate');
  };

  const handleContactAdmin = () => {
    window.open('mailto:avorextechnologies@gmail.com?subject=License%20Renewal%20Request', '_blank');
  };

  if (loading) {
    return (
      <section className="max-w-2xl animate-in fade-in-50 duration-200">
        <SettingsPanelHead
          title="License Information"
          description="View your active license details and subscription status."
        />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (!account?.license_key) {
    return (
      <section className="max-w-2xl animate-in fade-in-50 duration-200">
        <SettingsPanelHead
          title="License Information"
          description="View your active license details and subscription status."
        />
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">No Active License</h3>
              <p className="text-sm text-muted-foreground mt-1">
                You haven&apos;t activated a license yet. Contact an administrator to get a license key.
              </p>
            </div>
            <Button onClick={handleContactAdmin} variant="outline" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Contact Admin
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  const remainingDays = getRemainingDays(licenseInfo?.expiresAt ?? null);
  const isExpired = licenseInfo?.expiresAt ? new Date(licenseInfo.expiresAt) < new Date() : false;
  const isExpiringSoon = remainingDays !== null && remainingDays <= 7 && remainingDays > 0;

  const planColors: Record<string, string> = {
    Max: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    Premium: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    Starter: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
    Standard: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
    Enterprise: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  };

  return (
    <section className="max-w-2xl animate-in fade-in-50 duration-200">
      <SettingsPanelHead
        title="License Information"
        description="View your active license details and subscription status."
      />

      <div className="space-y-4">
        {/* License Status Card */}
        <Card className={cn(
          "overflow-hidden",
          isExpired && "border-red-500/20",
          isExpiringSoon && "border-amber-500/20"
        )}>
          <CardContent className="p-0">
            {/* Status Header */}
            <div className={cn(
              "px-6 py-4 border-b",
              isExpired ? "bg-red-500/5 border-red-500/10" :
              isExpiringSoon ? "bg-amber-500/5 border-amber-500/10" :
              "bg-emerald-500/5 border-emerald-500/10"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isExpired ? (
                    <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    </div>
                  ) : isExpiringSoon ? (
                    <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-amber-500" />
                    </div>
                  ) : (
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {isExpired ? 'License Expired' :
                       isExpiringSoon ? 'License Expiring Soon' :
                       'License Active'}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {isExpired ? 'Renew to continue using all features' :
                       isExpiringSoon ? `${remainingDays} day${remainingDays === 1 ? '' : 's'} remaining` :
                       'Your license is valid and active'}
                    </p>
                  </div>
                </div>
                {(isExpired || isExpiringSoon) && (
                  <Button
                    onClick={handleRenew}
                    size="sm"
                    className={cn(
                      "gap-1.5",
                      isExpired ? "bg-red-500 hover:bg-red-600 text-white" : "bg-primary text-primary-foreground"
                    )}
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    {isExpired ? 'Renew Now' : 'Renew'}
                  </Button>
                )}
              </div>
            </div>

            {/* License Details */}
            <div className="px-6 py-5 space-y-4">
              <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                <div className="space-y-1">
                  <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5" />
                    License Key
                  </dt>
                  <dd className="font-mono text-sm font-bold text-foreground flex items-center gap-2">
                    <span>{licenseInfo?.licenseKey ? maskLicenseKey(licenseInfo.licenseKey) : '—'}</span>
                    {licenseInfo?.licenseKey && (
                      <Button
                        onClick={() => {
                          if (licenseInfo?.licenseKey) {
                            navigator.clipboard.writeText(licenseInfo.licenseKey);
                            setCopied(true);
                            toast.success("লাইসেন্স কী কপি হয়েছে");
                            setTimeout(() => setCopied(false), 2000);
                          }
                        }}
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-zinc-400 hover:text-foreground"
                      >
                        {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    )}
                  </dd>
                </div>

                <div className="space-y-1">
                  <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" />
                    Package
                  </dt>
                  <dd>
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border",
                      planColors[licenseInfo?.plan || ''] || planColors.Standard
                    )}>
                      {licenseInfo?.packageName || licenseInfo?.plan || '—'}
                    </span>
                  </dd>
                </div>

                <div className="space-y-1">
                  <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Activation Date
                  </dt>
                  <dd className="text-foreground">
                    {licenseInfo?.activatedAt
                      ? new Date(licenseInfo.activatedAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : '—'}
                  </dd>
                </div>

                <div className="space-y-1">
                  <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Expiry Date
                  </dt>
                  <dd className={cn(
                    "font-medium",
                    isExpired ? "text-red-500" : isExpiringSoon ? "text-amber-500" : "text-foreground"
                  )}>
                    {licenseInfo?.expiresAt
                      ? new Date(licenseInfo.expiresAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'No expiry'}
                  </dd>
                </div>

                <div className="space-y-1">
                  <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Remaining
                  </dt>
                  <dd className={cn(
                    "font-medium",
                    isExpired ? "text-red-500" : isExpiringSoon ? "text-amber-500" : "text-foreground"
                  )}>
                    {formatRemainingTime(remainingDays)}
                  </dd>
                </div>

                <div className="space-y-1">
                  <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Monitor className="h-3.5 w-3.5" />
                    Registered Device
                  </dt>
                  <dd className="text-foreground text-xs">
                    Current device
                  </dd>
                </div>
              </dl>
            </div>
          </CardContent>
        </Card>

        {/* Package Features */}
        {licenseInfo?.packageFeatures && licenseInfo.packageFeatures.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-foreground uppercase tracking-wider">
                Included Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {licenseInfo.packageFeatures.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emerald-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Allowed Menus */}
        {licenseInfo?.allowedMenus && licenseInfo.allowedMenus.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-foreground uppercase tracking-wider">
                Accessible Modules
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {licenseInfo.allowedMenus.map((menu) => (
                  <span
                    key={menu}
                    className="inline-flex items-center rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-medium text-primary"
                  >
                    {menu}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button onClick={handleRenew} variant="outline" className="gap-2">
            <KeyRound className="h-4 w-4" />
            Renew License
          </Button>
          <Button onClick={handleContactAdmin} variant="ghost" className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Contact Admin
          </Button>
        </div>
      </div>
    </section>
  );
}
