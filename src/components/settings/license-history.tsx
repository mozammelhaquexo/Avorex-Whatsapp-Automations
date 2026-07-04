'use client';

import { useState, useEffect } from 'react';
import { 
  History, 
  Calendar, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  KeyRound,
  ShieldAlert,
  Loader2,
  Copy,
  Check
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { maskLicenseKey } from '@/lib/license';

interface LicenseHistoryItem {
  id: string;
  key_code: string;
  plan: string;
  status: 'active' | 'used' | 'disabled';
  start_date: string | null;
  expiry_date: string | null;
  duration: string | null;
  max_activations: number;
  activation_count: number;
  notes: string | null;
  packageName: string;
  features: string[];
}

export function LicenseHistoryPanel() {
  const [history, setHistory] = useState<LicenseHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/license/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data || []);
      }
    } catch (err) {
      console.error('Failed to load license history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getStatusBadge = (status: LicenseHistoryItem['status'], expiryDate: string | null) => {
    const isExpired = expiryDate ? new Date(expiryDate) < new Date() : false;
    
    if (status === 'disabled') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold border border-red-500/20 bg-red-500/10 text-red-500 rounded-full">
          <ShieldAlert className="h-3 w-3 shrink-0" />
          ডিজেবলড (Disabled)
        </span>
      );
    }
    
    if (isExpired) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold border border-amber-500/20 bg-amber-500/10 text-amber-500 rounded-full">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          মেয়াদোত্তীর্ণ (Expired)
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 rounded-full">
        <CheckCircle className="h-3 w-3 shrink-0" />
        সক্রিয় (Active)
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          লাইসেন্স হিস্ট্রি (License History)
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          আপনার বর্তমান এবং পূর্ববর্তী সকল ডিজিটাল লাইসেন্সের বিস্তারিত বিবরণ।
        </p>
      </div>

      {history.length === 0 ? (
        <Card className="border-zinc-800/40 bg-zinc-950/20">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="h-12 w-12 rounded-xl bg-zinc-900 flex items-center justify-center border border-zinc-850">
              <KeyRound className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">কোনো লাইসেন্স পাওয়া যায়নি</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                আপনার অ্যাকাউন্টে কোনো পূর্ববর্তী লাইসেন্স যুক্ত নেই।
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {history.map((lic) => (
            <Card key={lic.id} className="border-zinc-850 bg-zinc-950/30 overflow-hidden">
              <div className="border-b border-zinc-850 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 bg-zinc-950/60">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold text-foreground">{maskLicenseKey(lic.key_code)}</span>
                  <Button 
                    onClick={() => handleCopy(lic.key_code)} 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-zinc-400 hover:text-foreground hover:bg-zinc-850 rounded"
                  >
                    {copiedKey === lic.key_code ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
                {getStatusBadge(lic.status, lic.expiry_date)}
              </div>
              <CardContent className="p-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground block mb-0.5">প্যাকেজ</span>
                    <span className="font-semibold text-foreground block">{lic.packageName}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">Tier: {lic.plan}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block mb-0.5">অ্যাক্টিভেশন তারিখ</span>
                    <span className="font-semibold text-foreground block">
                      {lic.start_date ? new Date(lic.start_date).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block mb-0.5">মেয়াদ শেষের তারিখ</span>
                    <span className="font-semibold text-foreground block">
                      {lic.expiry_date ? new Date(lic.expiry_date).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : 'Lifetime'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block mb-0.5">ডিভাইস লিমিট</span>
                    <span className="font-semibold text-foreground block">
                      {lic.activation_count} / {lic.max_activations}
                    </span>
                    <span className="text-xs text-muted-foreground block">মেয়াদ: {lic.duration || '—'}</span>
                  </div>
                </div>

                {lic.notes && (
                  <div className="mt-4 p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-400">
                    <span className="font-semibold block mb-0.5">নোট:</span>
                    {lic.notes}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
